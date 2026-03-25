from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('verify-2fa/', views.Verify2FAView.as_view(), name='verify-2fa'),
    path('2fa-setup/', views.TwoFASetupView.as_view(), name='2fa-setup'),
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
    # Roles
    path('roles/', views.RoleListView.as_view(), name='role-list'),
    # Sessions
    path('sessions/', views.SessionListView.as_view(), name='session-list'),
    path('sessions/<uuid:pk>/', views.SessionRevokeView.as_view(), name='session-revoke'),
    path('sessions/revoke-all/', views.SessionRevokeAllView.as_view(), name='session-revoke-all'),
    # Session termination (for session limit flow)
    path('session-termination/request/', views.SessionTerminationRequestView.as_view(), name='session-termination-request'),
    path('session-termination/confirm/', views.SessionTerminationConfirmView.as_view(), name='session-termination-confirm'),
    # IP Restriction
    path('ip-restrictions/', views.IPRestrictionListCreateView.as_view(), name='ip-restriction-list'),
    path('ip-restrictions/<uuid:pk>/', views.IPRestrictionDeleteView.as_view(), name='ip-restriction-delete'),
    # Admin Dashboard
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
]
