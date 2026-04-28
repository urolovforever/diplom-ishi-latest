import base64
import io
import uuid

import qrcode
from django.db.models import Q, Count
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import get_totp_uri, verify_totp
from .models import CustomUser, PasswordResetToken, Role, SessionTerminationCode, UserSession
from audit.mixins import AuditMixin
from .permissions import IsSuperAdmin, IsLeader, ROLE_CREATION_MAP, LEADER_ROLES
from .security import SecurityManager, get_client_ip
from .serializers import (
    ChangePasswordSerializer,
    InviteSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    PublicKeySerializer,
    RoleSerializer,
    SessionTerminationConfirmSerializer,
    SessionTerminationRequestSerializer,
    UserSerializer,
    UserSessionSerializer,
    Verify2FASerializer,
)
from notifications.tasks import send_password_reset_email, send_session_termination_code


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Check if user exists and is locked
        try:
            user = CustomUser.objects.get(email=email)
            if SecurityManager.check_account_lockout(user):
                SecurityManager.record_login_attempt(email, ip_address, user_agent, False, user)
                return Response(
                    {'detail': _('Account is locked due to multiple failed login attempts. Try again later.')},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except CustomUser.DoesNotExist:
            user = None

        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            if user:
                SecurityManager.record_login_attempt(email, ip_address, user_agent, False, user)
            else:
                SecurityManager.record_login_attempt(email, ip_address, user_agent, False)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']

        if user.is_2fa_enabled and user.totp_secret:
            # Send SMS code if user prefers SMS 2FA
            if user.twofa_method == 'sms' and user.phone_number:
                from .sms import create_and_send_sms_code
                create_and_send_sms_code(user)

            return Response({
                'requires_2fa': True,
                'user_id': str(user.id),
                'twofa_method': user.twofa_method or 'totp',
                'is_2fa_confirmed': user.is_2fa_confirmed,
            }, status=status.HTTP_200_OK)

        # Check session limit before issuing tokens
        is_over_limit, active_sessions = SecurityManager.check_session_limit(user)
        if is_over_limit:
            SecurityManager.record_login_attempt(email, ip_address, user_agent, True, user)
            return Response({
                'session_limit_reached': True,
                'user_id': str(user.id),
                'active_sessions': UserSessionSerializer(
                    active_sessions, many=True,
                    context={'request': request},
                ).data,
            }, status=status.HTTP_409_CONFLICT)

        SecurityManager.record_login_attempt(email, ip_address, user_agent, True, user)

        response_data = self._issue_tokens(user, request)

        # Check password expiry
        if SecurityManager.check_password_expiry(user):
            response_data['must_change_password'] = True

        if user.must_change_password:
            response_data['must_change_password'] = True

        return Response(response_data, status=status.HTTP_200_OK)

    def _issue_tokens(self, user, request):
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')

        # Deactivate old sessions from the same device (IP + User-Agent)
        UserSession.objects.filter(
            user=user, is_active=True, ip_address=ip, user_agent=ua,
        ).update(is_active=False)

        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=ip,
            user_agent=ua,
            expires_at=timezone.now() + timedelta(days=30),
        )
        SecurityManager.enforce_session_limit(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }


class Verify2FAView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = CustomUser.objects.get(id=serializer.validated_data['user_id'])
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': _('Invalid user.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify based on 2FA method
        token_value = serializer.validated_data['token']
        if user.twofa_method == 'sms':
            from .sms import verify_sms_code
            valid = verify_sms_code(user, token_value)
        else:
            valid = verify_totp(user.totp_secret, token_value)

        if not valid:
            return Response(
                {'detail': _('Invalid 2FA token.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark 2FA as confirmed on first successful verification
        if not user.is_2fa_confirmed:
            user.is_2fa_confirmed = True
            user.save(update_fields=['is_2fa_confirmed'])

        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Check session limit before issuing tokens
        is_over_limit, active_sessions = SecurityManager.check_session_limit(user)
        if is_over_limit:
            SecurityManager.record_login_attempt(user.email, ip_address, user_agent, True, user)
            return Response({
                'session_limit_reached': True,
                'user_id': str(user.id),
                'active_sessions': UserSessionSerializer(
                    active_sessions, many=True,
                    context={'request': request},
                ).data,
            }, status=status.HTTP_409_CONFLICT)

        SecurityManager.record_login_attempt(user.email, ip_address, user_agent, True, user)

        # Deactivate old sessions from the same device
        UserSession.objects.filter(
            user=user, is_active=True, ip_address=ip_address, user_agent=user_agent,
        ).update(is_active=False)

        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=timezone.now() + timedelta(days=30),
        )
        SecurityManager.enforce_session_limit(user)

        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }
        if SecurityManager.check_password_expiry(user) or user.must_change_password:
            response_data['must_change_password'] = True

        return Response(response_data, status=status.HTTP_200_OK)


class TwoFASetupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'detail': _('user_id is required.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use consistent error response to prevent user enumeration
        generic_error = Response(
            {'detail': _('2FA setup is not available.')},
            status=status.HTTP_400_BAD_REQUEST,
        )

        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return generic_error

        if not user.totp_secret:
            return generic_error

        # QR code only available during first-time setup
        if user.is_2fa_confirmed:
            return generic_error

        uri = get_totp_uri(user.totp_secret, user.email)

        img = qrcode.make(uri, box_size=6, border=2)
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            'qr_code': f'data:image/png;base64,{qr_base64}',
            'secret': user.totp_secret,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            # Always deactivate the session, regardless of token blacklist result
            UserSession.objects.filter(
                user=request.user,
                refresh_token=refresh_token,
            ).update(is_active=False)
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class UserListView(AuditMixin, generics.ListCreateAPIView):
    permission_classes = [IsLeader]

    def get_queryset(self):
        user = self.request.user
        qs = CustomUser.objects.select_related('role', 'confession', 'organization').all()
        role_name = user.role.name if user.role else None

        if role_name == Role.SUPER_ADMIN:
            return qs
        elif role_name == Role.KONFESSIYA_RAHBARI:
            if user.confession:
                from confessions.models import Organization
                org_ids = list(
                    Organization.objects.filter(confession=user.confession).values_list('id', flat=True)
                )
                return qs.filter(
                    Q(confession=user.confession) | Q(organization_id__in=org_ids)
                )
            return qs.none()
        elif role_name == Role.DT_RAHBAR:
            if user.organization:
                return qs.filter(organization=user.organization)
            return qs.none()
        return qs.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InviteSerializer
        return UserSerializer


class UserDetailView(AuditMixin, generics.RetrieveUpdateAPIView):
    queryset = CustomUser.objects.select_related('role', 'confession', 'organization').all()
    serializer_class = UserSerializer
    permission_classes = [IsLeader]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        # Faqat super_admin edit qila oladi
        if request.user.role and request.user.role.name != Role.SUPER_ADMIN:
            return Response(
                {'detail': _("Siz foydalanuvchini tahrirlash huquqiga ega emassiz.")},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_password = serializer.validated_data['new_password']

        # Check password history
        if SecurityManager.check_password_history(user, new_password):
            return Response(
                {'detail': _('Cannot reuse one of your last 5 passwords.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save current password to history before changing
        SecurityManager.save_password_history(user)

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.must_change_password = False
        user.save(update_fields=['password', 'password_changed_at', 'must_change_password'])

        return Response({'detail': _('Password changed successfully.')}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
            token = uuid.uuid4().hex
            PasswordResetToken.objects.create(user=user, token=token)
            send_password_reset_email.delay(user.email, token)
        except CustomUser.DoesNotExist:
            pass  # Don't reveal whether email exists

        return Response(
            {'detail': _('If an account with that email exists, a reset link has been sent.')},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reset_token = PasswordResetToken.objects.get(
                token=serializer.validated_data['token'],
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': _('Invalid or expired token.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_token.is_valid:
            return Response(
                {'detail': _('Invalid or expired token.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user
        new_password = serializer.validated_data['new_password']

        # Save current password to history
        SecurityManager.save_password_history(user)

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.must_change_password = False
        user.save(update_fields=['password', 'password_changed_at', 'must_change_password'])

        reset_token.is_used = True
        reset_token.confirmed_at = timezone.now()
        reset_token.save(update_fields=['is_used', 'confirmed_at'])

        return Response(
            {'detail': _('Password has been reset successfully.')},
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PublicKeyView(APIView):
    """Store the current user's public key for E2E encryption."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PublicKeySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.public_key = serializer.validated_data['public_key']
        update_fields = ['public_key']

        if 'encrypted_private_key' in serializer.validated_data:
            user.encrypted_private_key = serializer.validated_data['encrypted_private_key']
            update_fields.append('encrypted_private_key')

        user.save(update_fields=update_fields)
        return Response({'detail': _('Public key saved successfully.')}, status=status.HTTP_200_OK)

    def get(self, request):
        user = request.user
        return Response({
            'public_key': user.public_key,
            'encrypted_private_key': user.encrypted_private_key,
            'has_public_key': bool(user.public_key),
            'has_keys': bool(user.public_key),
        })


class UserPublicKeyView(APIView):
    """Get any user's public key by UUID (for encrypting data for them)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk, is_active=True)
        except CustomUser.DoesNotExist:
            return Response({'detail': _('User not found.')}, status=status.HTTP_404_NOT_FOUND)

        if not user.public_key:
            return Response(
                {'detail': _('User has not set up E2E encryption yet.')},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'user_id': str(user.id),
            'public_key': user.public_key,
        })


class E2ERecipientsView(APIView):
    """Get public keys of all users who should receive encrypted keys for a document."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization_id = request.query_params.get('organization')
        from confessions.models import Organization

        recipients = []
        # Always include super_admins
        admins = CustomUser.objects.filter(
            role__name__in=['super_admin'],
            is_active=True,
            public_key__isnull=False,
        ).exclude(public_key='')

        for admin in admins:
            recipients.append({
                'user_id': str(admin.id),
                'email': admin.email,
                'role': admin.role.name,
                'public_key': admin.public_key,
            })

        # Include leader of the organization
        if organization_id:
            try:
                org = Organization.objects.select_related('leader').get(pk=organization_id)
                if org.leader and org.leader.public_key and str(org.leader.id) not in [r['user_id'] for r in recipients]:
                    recipients.append({
                        'user_id': str(org.leader.id),
                        'email': org.leader.email,
                        'role': org.leader.role.name if org.leader.role else 'unknown',
                        'public_key': org.leader.public_key,
                    })
            except Organization.DoesNotExist:
                pass

        # Include current user (author)
        if request.user.public_key and str(request.user.id) not in [r['user_id'] for r in recipients]:
            recipients.append({
                'user_id': str(request.user.id),
                'email': request.user.email,
                'role': request.user.role.name if request.user.role else 'member',
                'public_key': request.user.public_key,
            })

        return Response(recipients)


class RoleListView(generics.ListAPIView):
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if user.role:
            allowed_roles = ROLE_CREATION_MAP.get(user.role.name, [])
            if allowed_roles:
                return Role.objects.filter(name__in=allowed_roles)
        return Role.objects.all()


class IPRestrictionListCreateView(AuditMixin, generics.ListCreateAPIView):
    """Manage IP whitelist/blacklist entries."""
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        from .models import IPRestriction
        return IPRestriction.objects.select_related('created_by').all()

    def get_serializer_class(self):
        from .serializers import IPRestrictionSerializer
        return IPRestrictionSerializer

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._create_audit_log('create', instance)


class SessionListView(APIView):
    """List current user's active sessions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Show only active sessions
        sessions = UserSession.objects.filter(
            user=request.user,
            is_active=True,
        ).order_by('-created_at')

        # Find current session by matching IP + user_agent
        current_session_id = None
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        current = sessions.filter(
            ip_address=ip, user_agent=ua, is_active=True,
        ).order_by('-last_activity').first()
        if current:
            current_session_id = str(current.id)

        serializer = UserSessionSerializer(
            sessions, many=True,
            context={'request': request, 'current_session_id': current_session_id},
        )
        return Response(serializer.data)


class SessionRevokeView(APIView):
    """Revoke (deactivate) a specific session."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            session = UserSession.objects.get(
                id=pk, user=request.user, is_active=True,
            )
        except UserSession.DoesNotExist:
            return Response(
                {'detail': _('Sessiya topilmadi.')},
                status=status.HTTP_404_NOT_FOUND,
            )

        session.is_active = False
        session.save(update_fields=['is_active'])

        # Blacklist the refresh token
        try:
            token = RefreshToken(session.refresh_token)
            token.blacklist()
        except Exception:
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionRevokeAllView(APIView):
    """Revoke all sessions except current one."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')

        sessions = UserSession.objects.filter(
            user=request.user, is_active=True,
        )

        # Try to find current session
        current = sessions.filter(ip_address=ip, user_agent=ua).order_by('-last_activity').first()

        others = sessions.exclude(id=current.id) if current else sessions
        for session in others:
            session.is_active = False
            session.save(update_fields=['is_active'])
            try:
                token = RefreshToken(session.refresh_token)
                token.blacklist()
            except Exception:
                pass

        count = others.count()
        return Response({'detail': _("{count} ta sessiya tugatildi.").format(count=count)})


class SessionTerminationRequestView(APIView):
    """Request a session termination code. Sends 6-digit code to user's email."""
    permission_classes = [AllowAny]

    def post(self, request):
        import random

        serializer = SessionTerminationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data['user_id']
        session_id = serializer.validated_data['session_id']

        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': _('Foydalanuvchi topilmadi.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            session = UserSession.objects.get(id=session_id, user=user, is_active=True)
        except UserSession.DoesNotExist:
            return Response(
                {'detail': _('Sessiya topilmadi.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Invalidate previous unused codes for this user
        SessionTerminationCode.objects.filter(
            user=user, is_used=False,
        ).update(is_used=True)

        # Generate 6-digit code
        code = f'{random.randint(0, 999999):06d}'

        SessionTerminationCode.objects.create(
            user=user,
            code=code,
            session_to_terminate=session,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        send_session_termination_code.delay(user.email, code)

        return Response(
            {'detail': _('Tasdiqlash kodi emailga yuborildi.')},
            status=status.HTTP_200_OK,
        )


class SessionTerminationConfirmView(APIView):
    """Confirm session termination with email code. Terminates old session, creates new one."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SessionTerminationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data['user_id']
        code = serializer.validated_data['code']

        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': _('Foydalanuvchi topilmadi.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find valid code
        try:
            termination_code = SessionTerminationCode.objects.filter(
                user=user, code=code, is_used=False,
            ).latest('created_at')
        except SessionTerminationCode.DoesNotExist:
            return Response(
                {'detail': _('Noto\'g\'ri kod.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not termination_code.is_valid:
            return Response(
                {'detail': _('Kod muddati tugagan. Qayta urinib ko\'ring.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Terminate the selected session
        session = termination_code.session_to_terminate
        if session.is_active:
            session.is_active = False
            session.save(update_fields=['is_active'])
            try:
                token = RefreshToken(session.refresh_token)
                token.blacklist()
            except Exception:
                pass

        # Mark code as used
        termination_code.is_used = True
        termination_code.save(update_fields=['is_used'])

        # Create new session using stored request context
        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=termination_code.ip_address,
            user_agent=termination_code.user_agent,
            expires_at=timezone.now() + timedelta(days=30),
        )
        SecurityManager.enforce_session_limit(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class IPRestrictionDeleteView(AuditMixin, generics.DestroyAPIView):
    """Delete an IP restriction entry."""
    permission_classes = [IsSuperAdmin]
    lookup_field = 'pk'

    def get_queryset(self):
        from .models import IPRestriction
        return IPRestriction.objects.all()


class AdminDashboardView(APIView):
    """Aggregated admin dashboard data for super_admin."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        now = timezone.now()
        last_30min = now - timedelta(minutes=30)
        last_24h = now - timedelta(hours=24)

        data = {
            **self._get_active_users(last_30min),
            **self._get_recent_logins(last_24h),
            'security_status': self._get_security_status(),
            'ip_restrictions': self._get_ip_restrictions(),
            'top_users': self._get_top_users(last_24h),
            'document_stats': self._get_document_stats(),
        }

        return Response(data)

    def _get_active_users(self, since):
        sessions = UserSession.objects.filter(
            is_active=True,
            last_activity__gte=since,
        ).select_related('user', 'user__role')

        active_users = []
        for s in sessions:
            active_users.append({
                'id': str(s.user.id),
                'email': s.user.email,
                'full_name': s.user.get_full_name(),
                'role': s.user.role.name if s.user.role else None,
                'ip_address': s.ip_address,
                'user_agent': s.user_agent,
                'last_activity': s.last_activity,
            })

        return {
            'active_users': active_users,
            'active_users_count': len(active_users),
        }

    def _get_recent_logins(self, since):
        from .models import LoginAttempt

        recent = LoginAttempt.objects.order_by('-created_at')[:50]
        recent_logins = []
        for la in recent:
            recent_logins.append({
                'email': la.email,
                'ip_address': la.ip_address,
                'user_agent': la.user_agent,
                'success': la.success,
                'created_at': la.created_at,
            })

        logins_24h = LoginAttempt.objects.filter(created_at__gte=since)
        failed = logins_24h.filter(success=False).count()
        successful = logins_24h.filter(success=True).count()

        return {
            'recent_logins': recent_logins,
            'failed_logins_24h': failed,
            'successful_logins_24h': successful,
        }

    def _get_security_status(self):
        users = CustomUser.objects.filter(is_active=True)
        total = users.count()
        twofa_enabled = users.filter(is_2fa_enabled=True, is_2fa_confirmed=True).count()
        locked = users.filter(locked_until__gt=timezone.now()).count()

        password_expiry_days = 90
        expired_date = timezone.now() - timedelta(days=password_expiry_days)
        password_expired = users.filter(
            Q(password_changed_at__lt=expired_date) | Q(password_changed_at__isnull=True)
        ).count()

        e2e_keys = users.exclude(Q(public_key__isnull=True) | Q(public_key='')).count()

        return {
            'total_users': total,
            'users_2fa_enabled': twofa_enabled,
            'users_2fa_disabled': total - twofa_enabled,
            'users_password_expired': password_expired,
            'users_locked': locked,
            'e2e_keys_setup': e2e_keys,
        }

    def _get_ip_restrictions(self):
        from .models import IPRestriction

        restrictions = IPRestriction.objects.select_related('created_by').all()
        result = []
        for r in restrictions:
            result.append({
                'id': str(r.id),
                'ip_address': r.ip_address,
                'list_type': r.list_type,
                'reason': r.reason,
                'is_active': r.is_active,
                'created_by_email': r.created_by.email if r.created_by else None,
                'created_at': r.created_at,
            })
        return result

    def _get_top_users(self, since):
        from ai_security.models import ActivityLog
        from documents.models import DocumentAccessLog

        top = (
            ActivityLog.objects.filter(created_at__gte=since, user__isnull=False)
            .values('user__id', 'user__email', 'user__first_name', 'user__last_name', 'user__role__name')
            .annotate(requests_count=Count('id'))
            .order_by('-requests_count')[:10]
        )

        result = []
        for entry in top:
            user_id = entry['user__id']
            docs_downloaded = DocumentAccessLog.objects.filter(
                user_id=user_id,
                action='download',
                created_at__gte=since,
            ).count()
            errors_count = ActivityLog.objects.filter(
                user_id=user_id,
                response_status__gte=400,
                created_at__gte=since,
            ).count()

            full_name = f"{entry['user__first_name']} {entry['user__last_name']}".strip()
            result.append({
                'email': entry['user__email'],
                'full_name': full_name,
                'role': entry['user__role__name'],
                'requests_count': entry['requests_count'],
                'docs_downloaded': docs_downloaded,
                'errors_count': errors_count,
            })

        return result

    def _get_document_stats(self):
        from documents.models import Document, DocumentAccessLog

        total = Document.objects.count()

        by_level = Document.objects.values('security_level').annotate(c=Count('id'))
        by_security_level = {item['security_level']: item['c'] for item in by_level}
        for lvl in ['public', 'internal', 'confidential', 'secret']:
            by_security_level.setdefault(lvl, 0)

        e2e_count = Document.objects.filter(is_e2e_encrypted=True).count()

        most_accessed = (
            DocumentAccessLog.objects
            .values('document__id', 'document__title', 'document__security_level')
            .annotate(access_count=Count('id'))
            .order_by('-access_count')[:10]
        )
        most_accessed_list = [
            {
                'title': item['document__title'],
                'access_count': item['access_count'],
                'security_level': item['document__security_level'],
            }
            for item in most_accessed
        ]

        recent_downloads = (
            DocumentAccessLog.objects
            .filter(action='download')
            .select_related('document', 'user')
            .order_by('-created_at')[:10]
        )
        recent_downloads_list = [
            {
                'document_title': dl.document.title,
                'user_email': dl.user.email if dl.user else None,
                'created_at': dl.created_at,
                'ip_address': dl.ip_address,
            }
            for dl in recent_downloads
        ]

        return {
            'total_documents': total,
            'by_security_level': by_security_level,
            'e2e_encrypted_count': e2e_count,
            'most_accessed': most_accessed_list,
            'recent_downloads': recent_downloads_list,
        }
