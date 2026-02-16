import uuid

from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import verify_totp
from .models import CustomUser, PasswordResetToken, UserSession
from .permissions import IsSuperAdmin
from .security import SecurityManager
from .serializers import (
    ChangePasswordSerializer,
    InviteSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    PublicKeySerializer,
    UserSerializer,
    Verify2FASerializer,
)
from notifications.tasks import send_password_reset_email


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Check if user exists and is locked
        try:
            user = CustomUser.objects.get(email=email)
            if SecurityManager.check_account_lockout(user):
                SecurityManager.record_login_attempt(email, ip_address, user_agent, False, user)
                return Response(
                    {'detail': 'Account is locked due to multiple failed login attempts. Try again later.'},
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
            }, status=status.HTTP_200_OK)

        SecurityManager.record_login_attempt(email, ip_address, user_agent, True, user)

        response_data = self._issue_tokens(user, request)

        # Check password expiry
        if SecurityManager.check_password_expiry(user):
            response_data['must_change_password'] = True

        if user.must_change_password:
            response_data['must_change_password'] = True

        return Response(response_data, status=status.HTTP_200_OK)

    def _issue_tokens(self, user, request):
        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            expires_at=timezone.now() + timedelta(days=1),
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
                {'detail': 'Invalid user.'},
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
                {'detail': 'Invalid 2FA token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        SecurityManager.record_login_attempt(user.email, ip_address, user_agent, True, user)

        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=timezone.now() + timedelta(days=1),
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


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                UserSession.objects.filter(
                    user=request.user,
                    refresh_token=refresh_token,
                ).update(is_active=False)
        except Exception:
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class UserListView(generics.ListCreateAPIView):
    queryset = CustomUser.objects.select_related('role').all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InviteSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = CustomUser.objects.select_related('role').all()
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = 'pk'


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
                {'detail': 'Cannot reuse one of your last 5 passwords.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save current password to history before changing
        SecurityManager.save_password_history(user)

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.must_change_password = False
        user.save(update_fields=['password', 'password_changed_at', 'must_change_password'])

        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


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
            {'detail': 'If an account with that email exists, a reset link has been sent.'},
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
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_token.is_valid:
            return Response(
                {'detail': 'Invalid or expired token.'},
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
        reset_token.save(update_fields=['is_used'])

        return Response(
            {'detail': 'Password has been reset successfully.'},
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
        return Response({'detail': 'Public key saved successfully.'}, status=status.HTTP_200_OK)

    def get(self, request):
        user = request.user
        return Response({
            'public_key': user.public_key,
            'encrypted_private_key': user.encrypted_private_key,
            'has_public_key': bool(user.public_key),
        })


class UserPublicKeyView(APIView):
    """Get any user's public key by UUID (for encrypting data for them)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk, is_active=True)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not user.public_key:
            return Response(
                {'detail': 'User has not set up E2E encryption yet.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'user_id': str(user.id),
            'public_key': user.public_key,
        })


class E2ERecipientsView(APIView):
    """Get public keys of all users who should receive encrypted keys for a confession."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization_id = request.query_params.get('organization')
        from confessions.models import Organization

        recipients = []
        # Always include super_admins and qomita_rahbars
        admins = CustomUser.objects.filter(
            role__name__in=['super_admin', 'qomita_rahbar'],
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

        # Include confession leader of the organization
        if organization_id:
            try:
                org = Organization.objects.select_related('leader').get(pk=organization_id)
                if org.leader and org.leader.public_key and str(org.leader.id) not in [r['user_id'] for r in recipients]:
                    recipients.append({
                        'user_id': str(org.leader.id),
                        'email': org.leader.email,
                        'role': 'confession_leader',
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
