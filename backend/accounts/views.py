from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import verify_totp
from .models import CustomUser, UserSession
from .permissions import IsSuperAdmin
from .serializers import (
    ChangePasswordSerializer,
    InviteSerializer,
    LoginSerializer,
    UserSerializer,
    Verify2FASerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        if user.is_2fa_enabled and user.totp_secret:
            return Response({
                'requires_2fa': True,
                'user_id': str(user.id),
            }, status=status.HTTP_200_OK)

        return self._issue_tokens(user, request)

    def _issue_tokens(self, user, request):
        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            expires_at=timezone.now() + timedelta(days=1),
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


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

        refresh = RefreshToken.for_user(user)
        UserSession.objects.create(
            user=user,
            refresh_token=str(refresh),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            expires_at=timezone.now() + timedelta(days=1),
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


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
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
