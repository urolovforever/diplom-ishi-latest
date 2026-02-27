from datetime import timedelta

from django.test import TestCase, override_settings
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import CustomUser, LoginAttempt, PasswordHistory, PasswordResetToken, Role, UserSession
from .validators import validate_password_strength
from .authentication import generate_totp_secret, verify_totp
from .security import SecurityManager


class RoleModelTest(TestCase):
    def test_create_role(self):
        role = Role.objects.create(name=Role.SUPER_ADMIN, description='Full access')
        self.assertEqual(role.name, 'super_admin')
        self.assertEqual(str(role), 'Super Admin')

    def test_role_name_unique(self):
        Role.objects.create(name=Role.SUPER_ADMIN)
        with self.assertRaises(Exception):
            Role.objects.create(name=Role.SUPER_ADMIN)

    def test_five_role_choices(self):
        self.assertEqual(len(Role.ROLE_CHOICES), 5)

    def test_role_constants(self):
        self.assertEqual(Role.SUPER_ADMIN, 'super_admin')
        self.assertEqual(Role.KONFESSIYA_RAHBARI, 'konfessiya_rahbari')
        self.assertEqual(Role.KONFESSIYA_XODIMI, 'konfessiya_xodimi')
        self.assertEqual(Role.DT_RAHBAR, 'dt_rahbar')
        self.assertEqual(Role.DT_XODIMI, 'dt_xodimi')


class CustomUserManagerTest(TestCase):
    def test_create_user(self):
        user = CustomUser.objects.create_user(
            email='user@example.com',
            password='TestPass123!@#',
            first_name='Test',
            last_name='User',
        )
        self.assertEqual(user.email, 'user@example.com')
        self.assertTrue(user.check_password('TestPass123!@#'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_create_user_no_email_raises(self):
        with self.assertRaises(ValueError):
            CustomUser.objects.create_user(email='', password='TestPass123!@#')

    def test_create_superuser(self):
        user = CustomUser.objects.create_superuser(
            email='admin@example.com',
            password='TestPass123!@#',
            first_name='Admin',
            last_name='User',
        )
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_create_superuser_not_staff_raises(self):
        with self.assertRaises(ValueError):
            CustomUser.objects.create_superuser(
                email='admin@example.com',
                password='TestPass123!@#',
                first_name='Admin',
                last_name='User',
                is_staff=False,
            )

    def test_create_superuser_not_superuser_raises(self):
        with self.assertRaises(ValueError):
            CustomUser.objects.create_superuser(
                email='admin@example.com',
                password='TestPass123!@#',
                first_name='Admin',
                last_name='User',
                is_superuser=False,
            )


class CustomUserModelTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            password='TestPass123!@#',
            first_name='John',
            last_name='Doe',
        )

    def test_str(self):
        self.assertEqual(str(self.user), 'test@example.com')

    def test_get_full_name(self):
        self.assertEqual(self.user.get_full_name(), 'John Doe')

    def test_email_normalized(self):
        user = CustomUser.objects.create_user(
            email='Test@EXAMPLE.COM',
            password='TestPass123!@#',
            first_name='A',
            last_name='B',
        )
        self.assertEqual(user.email, 'Test@example.com')

    def test_uuid_primary_key(self):
        self.assertIsNotNone(self.user.id)
        self.assertEqual(len(str(self.user.id)), 36)

    def test_is_locked_false_by_default(self):
        self.assertFalse(self.user.is_locked)

    def test_is_locked_when_locked_until_in_future(self):
        self.user.locked_until = timezone.now() + timedelta(minutes=30)
        self.assertTrue(self.user.is_locked)

    def test_is_locked_false_when_expired(self):
        self.user.locked_until = timezone.now() - timedelta(minutes=1)
        self.assertFalse(self.user.is_locked)

    def test_security_fields_defaults(self):
        self.assertIsNone(self.user.password_changed_at)
        self.assertFalse(self.user.must_change_password)
        self.assertEqual(self.user.failed_login_count, 0)
        self.assertIsNone(self.user.locked_until)

    def test_user_confession_and_organization_fks(self):
        from confessions.models import Confession, Organization
        confession = Confession.objects.create(name='Test Confession')
        org = Organization.objects.create(name='Test Org', confession=confession)
        self.user.confession = confession
        self.user.organization = org
        self.user.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.confession, confession)
        self.assertEqual(self.user.organization, org)

    def test_effective_confession_from_direct_fk(self):
        from confessions.models import Confession
        confession = Confession.objects.create(name='Direct Confession')
        self.user.confession = confession
        self.user.save()
        self.assertEqual(self.user.effective_confession, confession)

    def test_effective_confession_from_organization(self):
        from confessions.models import Confession, Organization
        confession = Confession.objects.create(name='Via Org')
        org = Organization.objects.create(name='Org', confession=confession)
        self.user.organization = org
        self.user.save()
        self.assertEqual(self.user.effective_confession, confession)


class PasswordValidatorTest(TestCase):
    def test_valid_password(self):
        validate_password_strength('StrongPass1!@')

    def test_too_short(self):
        with self.assertRaises(ValidationError):
            validate_password_strength('Short1!@')

    def test_no_uppercase(self):
        with self.assertRaises(ValidationError):
            validate_password_strength('nouppercase1!@#')

    def test_no_lowercase(self):
        with self.assertRaises(ValidationError):
            validate_password_strength('NOLOWERCASE1!@#')

    def test_no_digit(self):
        with self.assertRaises(ValidationError):
            validate_password_strength('NoDigitHere!@#$')

    def test_no_special_char(self):
        with self.assertRaises(ValidationError):
            validate_password_strength('NoSpecialChar123')


class TOTPAuthenticationTest(TestCase):
    def test_generate_secret(self):
        secret = generate_totp_secret()
        self.assertIsInstance(secret, str)
        self.assertGreater(len(secret), 10)

    def test_verify_totp_valid(self):
        import pyotp
        secret = generate_totp_secret()
        totp = pyotp.TOTP(secret)
        token = totp.now()
        self.assertTrue(verify_totp(secret, token))

    def test_verify_totp_invalid(self):
        secret = generate_totp_secret()
        self.assertFalse(verify_totp(secret, '000000'))


class SecurityManagerTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='sec@example.com',
            password='TestPass123!@#',
            first_name='Sec',
            last_name='User',
        )

    def test_save_and_check_password_history(self):
        SecurityManager.save_password_history(self.user)
        self.assertTrue(SecurityManager.check_password_history(self.user, 'TestPass123!@#'))
        self.assertFalse(SecurityManager.check_password_history(self.user, 'DifferentPass1!@'))

    def test_password_history_limit(self):
        # Save 6 passwords, only last 5 should be checked
        passwords = [f'Password{i}!@#A' for i in range(6)]
        for pw in passwords:
            self.user.set_password(pw)
            self.user.save()
            SecurityManager.save_password_history(self.user)

        # Oldest (first) password should not be in history check
        self.assertFalse(SecurityManager.check_password_history(self.user, passwords[0]))

    def test_check_password_expiry_not_expired(self):
        self.user.password_changed_at = timezone.now()
        self.assertFalse(SecurityManager.check_password_expiry(self.user))

    def test_check_password_expiry_expired(self):
        self.user.password_changed_at = timezone.now() - timedelta(days=91)
        self.assertTrue(SecurityManager.check_password_expiry(self.user))

    def test_check_password_expiry_no_date(self):
        self.user.password_changed_at = None
        self.assertFalse(SecurityManager.check_password_expiry(self.user))

    def test_record_login_attempt_success(self):
        SecurityManager.record_login_attempt('sec@example.com', '127.0.0.1', '', True, self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_count, 0)
        self.assertIsNone(self.user.locked_until)
        self.assertEqual(LoginAttempt.objects.count(), 1)

    def test_record_login_attempt_failure(self):
        SecurityManager.record_login_attempt('sec@example.com', '127.0.0.1', '', False, self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_count, 1)

    def test_account_lockout_after_5_failures(self):
        for _ in range(5):
            SecurityManager.record_login_attempt('sec@example.com', '127.0.0.1', '', False, self.user)
            self.user.refresh_from_db()
        self.assertIsNotNone(self.user.locked_until)
        self.assertTrue(SecurityManager.check_account_lockout(self.user))

    def test_lockout_expires(self):
        self.user.locked_until = timezone.now() - timedelta(minutes=1)
        self.user.failed_login_count = 5
        self.user.save()
        self.assertFalse(SecurityManager.check_account_lockout(self.user))
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_count, 0)

    def test_enforce_session_limit(self):
        for i in range(5):
            UserSession.objects.create(
                user=self.user,
                refresh_token=f'token_{i}',
                expires_at=timezone.now() + timedelta(days=1),
            )
        SecurityManager.enforce_session_limit(self.user)
        active = UserSession.objects.filter(user=self.user, is_active=True).count()
        self.assertLessEqual(active, 3)


class LoginViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='login@example.com',
            password='TestPass123!@#',
            first_name='Login',
            last_name='User',
            is_2fa_enabled=False,
        )
        self.login_url = '/api/accounts/login/'

    def test_login_success(self):
        response = self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    def test_login_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        response = self.client.post(self.login_url, {
            'email': 'nobody@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_creates_session(self):
        self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(UserSession.objects.filter(user=self.user).count(), 1)

    def test_login_requires_2fa(self):
        self.user.is_2fa_enabled = True
        self.user.totp_secret = generate_totp_secret()
        self.user.save()

        response = self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['requires_2fa'])
        self.assertIn('user_id', response.data)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_locked_account(self):
        self.user.locked_until = timezone.now() + timedelta(minutes=30)
        self.user.save()
        response = self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_records_attempt(self):
        self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(LoginAttempt.objects.filter(email='login@example.com').count(), 1)

    def test_login_failed_records_attempt(self):
        self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'wrongpassword',
        })
        attempt = LoginAttempt.objects.filter(email='login@example.com').first()
        self.assertIsNotNone(attempt)
        self.assertFalse(attempt.success)

    def test_login_password_expiry_flag(self):
        self.user.password_changed_at = timezone.now() - timedelta(days=91)
        self.user.save()
        response = self.client.post(self.login_url, {
            'email': 'login@example.com',
            'password': 'TestPass123!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('must_change_password'))


@override_settings(REST_FRAMEWORK={
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {},
})
class Verify2FAViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.secret = generate_totp_secret()
        self.user = CustomUser.objects.create_user(
            email='twofa@example.com',
            password='TestPass123!@#',
            first_name='2FA',
            last_name='User',
            is_2fa_enabled=True,
            totp_secret=self.secret,
        )
        self.url = '/api/accounts/verify-2fa/'

    def test_verify_valid_token(self):
        import pyotp
        token = pyotp.TOTP(self.secret).now()
        response = self.client.post(self.url, {
            'user_id': str(self.user.id),
            'token': token,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_verify_invalid_token(self):
        response = self.client.post(self.url, {
            'user_id': str(self.user.id),
            'token': '000000',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_invalid_user(self):
        response = self.client.post(self.url, {
            'user_id': '00000000-0000-0000-0000-000000000000',
            'token': '123456',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='logout@example.com',
            password='TestPass123!@#',
            first_name='Logout',
            last_name='User',
            is_2fa_enabled=False,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': 'logout@example.com',
            'password': 'TestPass123!@#',
        })
        self.access = response.data['access']
        self.refresh = response.data['refresh']

    def test_logout_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')
        response = self.client.post('/api/accounts/logout/', {
            'refresh': self.refresh,
        })
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_unauthenticated(self):
        response = self.client.post('/api/accounts/logout/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='changepass@example.com',
            password='OldPass123!@#$',
            first_name='Change',
            last_name='Pass',
            is_2fa_enabled=False,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': 'changepass@example.com',
            'password': 'OldPass123!@#$',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_change_password_success(self):
        response = self.client.post('/api/accounts/change-password/', {
            'old_password': 'OldPass123!@#$',
            'new_password': 'NewPass456!@#$',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass456!@#$'))

    def test_change_password_wrong_old(self):
        response = self.client.post('/api/accounts/change-password/', {
            'old_password': 'WrongOldPass1!@',
            'new_password': 'NewPass456!@#$',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_weak_new(self):
        response = self.client.post('/api/accounts/change-password/', {
            'old_password': 'OldPass123!@#$',
            'new_password': 'weak',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_saves_history(self):
        self.client.post('/api/accounts/change-password/', {
            'old_password': 'OldPass123!@#$',
            'new_password': 'NewPass456!@#$',
        })
        self.assertEqual(PasswordHistory.objects.filter(user=self.user).count(), 1)

    def test_change_password_blocks_reuse(self):
        # Change password first time
        self.client.post('/api/accounts/change-password/', {
            'old_password': 'OldPass123!@#$',
            'new_password': 'NewPass456!@#$',
        })
        # Re-login with new password
        response = self.client.post('/api/accounts/login/', {
            'email': 'changepass@example.com',
            'password': 'NewPass456!@#$',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        # Try to reuse old password
        response = self.client.post('/api/accounts/change-password/', {
            'old_password': 'NewPass456!@#$',
            'new_password': 'OldPass123!@#$',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_sets_changed_at(self):
        self.client.post('/api/accounts/change-password/', {
            'old_password': 'OldPass123!@#$',
            'new_password': 'NewPass456!@#$',
        })
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.password_changed_at)


class UserListViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.dt_xodimi_role = Role.objects.create(name=Role.DT_XODIMI)

        from confessions.models import Confession, Organization
        self.confession = Confession.objects.create(name='Test Confession')
        self.org = Organization.objects.create(name='Test Org', confession=self.confession)

        self.admin = CustomUser.objects.create_user(
            email='admin@example.com',
            password='AdminPass123!@#',
            first_name='Admin',
            last_name='User',
            role=self.admin_role,
            is_2fa_enabled=False,
        )
        self.dt_xodimi = CustomUser.objects.create_user(
            email='dtxodim@example.com',
            password='DtXodimPass123!@',
            first_name='DT',
            last_name='Xodim',
            role=self.dt_xodimi_role,
            organization=self.org,
            is_2fa_enabled=False,
        )
        self.url = '/api/accounts/users/'

    def _login(self, email, password):
        response = self.client.post('/api/accounts/login/', {
            'email': email,
            'password': password,
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_admin_can_list_users(self):
        self._login('admin@example.com', 'AdminPass123!@#')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dt_xodimi_cannot_list_users(self):
        self._login('dtxodim@example.com', 'DtXodimPass123!@')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_invite_user(self):
        self._login('admin@example.com', 'AdminPass123!@#')
        response = self.client.post(self.url, {
            'email': 'invited@example.com',
            'first_name': 'Invited',
            'last_name': 'User',
            'role_id': str(self.dt_xodimi_role.id),
            'organization_id': str(self.org.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invited = CustomUser.objects.get(email='invited@example.com')
        self.assertFalse(invited.has_usable_password())


class PermissionsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.konfessiya_rahbari_role = Role.objects.create(name=Role.KONFESSIYA_RAHBARI)
        self.konfessiya_xodimi_role = Role.objects.create(name=Role.KONFESSIYA_XODIMI)
        self.dt_rahbar_role = Role.objects.create(name=Role.DT_RAHBAR)
        self.dt_xodimi_role = Role.objects.create(name=Role.DT_XODIMI)

    def _create_and_login(self, email, role):
        user = CustomUser.objects.create_user(
            email=email,
            password='TestPass123!@#',
            first_name='Test',
            last_name='User',
            role=role,
            is_2fa_enabled=False,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': email,
            'password': 'TestPass123!@#',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return user

    def test_super_admin_access_users(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_konfessiya_rahbari_access_users(self):
        """Konfessiya rahbari is a leader role and can access user list."""
        self._create_and_login('kr@test.com', self.konfessiya_rahbari_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dt_rahbar_access_users(self):
        """DT rahbar is a leader role and can access user list."""
        self._create_and_login('dr@test.com', self.dt_rahbar_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_konfessiya_xodimi_denied_users(self):
        self._create_and_login('kx@test.com', self.konfessiya_xodimi_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dt_xodimi_denied_users(self):
        self._create_and_login('dx@test.com', self.dt_xodimi_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProfileViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='profile@example.com',
            password='TestPass123!@#',
            first_name='Profile',
            last_name='User',
            is_2fa_enabled=False,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': 'profile@example.com',
            'password': 'TestPass123!@#',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_get_profile(self):
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@example.com')
        self.assertEqual(response.data['first_name'], 'Profile')

    def test_update_profile(self):
        response = self.client.put('/api/accounts/profile/', {
            'first_name': 'Updated',
            'last_name': 'Name',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['last_name'], 'Name')

    def test_profile_unauthenticated(self):
        self.client.credentials()
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='reset@example.com',
            password='TestPass123!@#',
            first_name='Reset',
            last_name='User',
        )

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_request_valid_email(self):
        response = self.client.post('/api/accounts/password-reset/', {
            'email': 'reset@example.com',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('If an account', response.data['detail'])

    def test_request_invalid_email_no_enumeration(self):
        response = self.client.post('/api/accounts/password-reset/', {
            'email': 'nonexistent@example.com',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('If an account', response.data['detail'])

    def test_confirm_valid_token(self):
        token = PasswordResetToken.objects.create(
            user=self.user,
            token='valid-test-token-123',
            expires_at=timezone.now() + timedelta(hours=1),
        )
        response = self.client.post('/api/accounts/password-reset/confirm/', {
            'token': 'valid-test-token-123',
            'new_password': 'NewSecurePass1!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewSecurePass1!@#'))
        token.refresh_from_db()
        self.assertTrue(token.is_used)

    def test_confirm_expired_token(self):
        PasswordResetToken.objects.create(
            user=self.user,
            token='expired-token-123',
            expires_at=timezone.now() - timedelta(hours=1),
        )
        response = self.client.post('/api/accounts/password-reset/confirm/', {
            'token': 'expired-token-123',
            'new_password': 'NewSecurePass1!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_used_token(self):
        PasswordResetToken.objects.create(
            user=self.user,
            token='used-token-123',
            expires_at=timezone.now() + timedelta(hours=1),
            is_used=True,
        )
        response = self.client.post('/api/accounts/password-reset/confirm/', {
            'token': 'used-token-123',
            'new_password': 'NewSecurePass1!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_invalid_token(self):
        response = self.client.post('/api/accounts/password-reset/confirm/', {
            'token': 'totally-invalid-token',
            'new_password': 'NewSecurePass1!@#',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SeedRolesCommandTest(TestCase):
    def test_seed_roles_creates_five_roles(self):
        call_command('seed_roles')
        self.assertEqual(Role.objects.count(), 5)
        self.assertTrue(Role.objects.filter(name='super_admin').exists())
        self.assertTrue(Role.objects.filter(name='konfessiya_rahbari').exists())
        self.assertTrue(Role.objects.filter(name='konfessiya_xodimi').exists())
        self.assertTrue(Role.objects.filter(name='dt_rahbar').exists())
        self.assertTrue(Role.objects.filter(name='dt_xodimi').exists())

    def test_seed_roles_idempotent(self):
        call_command('seed_roles')
        call_command('seed_roles')
        self.assertEqual(Role.objects.count(), 5)


class SeedDataCommandTest(TestCase):
    def test_seed_data_creates_users(self):
        call_command('seed_data')
        self.assertTrue(CustomUser.objects.filter(email='admin@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='konfessiya@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='kxodim@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='dtrahbar@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='dtxodim@scp.local').exists())
        self.assertEqual(Role.objects.count(), 5)

    def test_seed_data_idempotent(self):
        call_command('seed_data')
        count = CustomUser.objects.count()
        call_command('seed_data')
        self.assertEqual(CustomUser.objects.count(), count)


class PublicKeyViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='crypto@example.com',
            password='TestPass123!@#',
            first_name='Crypto',
            last_name='User',
            is_2fa_enabled=False,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': 'crypto@example.com',
            'password': 'TestPass123!@#',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_save_public_key(self):
        response = self.client.post('/api/accounts/e2e/keys/', {
            'public_key': '{"kty":"RSA","n":"test"}',
            'encrypted_private_key': '{"encrypted":"data"}',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.public_key, '{"kty":"RSA","n":"test"}')

    def test_get_own_keys(self):
        self.user.public_key = '{"kty":"RSA","n":"test"}'
        self.user.encrypted_private_key = '{"encrypted":"data"}'
        self.user.save()
        response = self.client.get('/api/accounts/e2e/keys/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['has_keys'])
        self.assertEqual(response.data['public_key'], '{"kty":"RSA","n":"test"}')

    def test_get_keys_when_none(self):
        response = self.client.get('/api/accounts/e2e/keys/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['has_keys'])

    def test_save_requires_public_key(self):
        response = self.client.post('/api/accounts/e2e/keys/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_denied(self):
        self.client.credentials()
        response = self.client.get('/api/accounts/e2e/keys/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserPublicKeyViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='viewer@example.com',
            password='TestPass123!@#',
            first_name='Viewer',
            last_name='User',
            is_2fa_enabled=False,
        )
        self.target = CustomUser.objects.create_user(
            email='target@example.com',
            password='TestPass123!@#',
            first_name='Target',
            last_name='User',
            public_key='{"kty":"RSA","n":"targetkey"}',
            is_2fa_enabled=False,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': 'viewer@example.com',
            'password': 'TestPass123!@#',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')

    def test_get_user_public_key(self):
        response = self.client.get(f'/api/accounts/e2e/keys/{self.target.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['public_key'], '{"kty":"RSA","n":"targetkey"}')
        self.assertEqual(response.data['user_id'], str(self.target.id))

    def test_get_nonexistent_user_key(self):
        response = self.client.get('/api/accounts/e2e/keys/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_denied(self):
        self.client.credentials()
        response = self.client.get(f'/api/accounts/e2e/keys/{self.target.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class HealthCheckTest(APITestCase):
    def test_health_check_returns_status(self):
        response = self.client.get('/api/health/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, 503])
        self.assertIn('status', response.json())
        self.assertIn('services', response.json())
        self.assertEqual(response.json()['services']['database'], 'ok')
