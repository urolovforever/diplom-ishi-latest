from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('verify-2fa/', views.Verify2FAView.as_view(), name='verify-2fa'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    # E2E Encryption endpoints
    path('e2e/keys/', views.PublicKeyView.as_view(), name='e2e-keys'),
    path('e2e/keys/<uuid:pk>/', views.UserPublicKeyView.as_view(), name='e2e-user-key'),
    path('e2e/recipients/', views.E2ERecipientsView.as_view(), name='e2e-recipients'),
]
