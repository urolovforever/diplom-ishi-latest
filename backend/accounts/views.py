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
            return Response({
                'requires_2fa': True,
                'user_id': str(user.id),
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

        if not verify_totp(user.totp_secret, serializer.validated_data['token']):
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
