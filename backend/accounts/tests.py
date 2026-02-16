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
        Role.objects.create(name=Role.MEMBER)
        with self.assertRaises(Exception):
            Role.objects.create(name=Role.MEMBER)

    def test_seven_role_choices(self):
        self.assertEqual(len(Role.ROLE_CHOICES), 7)

    def test_new_role_constants(self):
        self.assertEqual(Role.SECURITY_AUDITOR, 'security_auditor')
        self.assertEqual(Role.PSYCHOLOGIST, 'psychologist')
        self.assertEqual(Role.IT_ADMIN, 'it_admin')


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
        self.member_role = Role.objects.create(name=Role.MEMBER)
        self.admin = CustomUser.objects.create_user(
            email='admin@example.com',
            password='AdminPass123!@#',
            first_name='Admin',
            last_name='User',
            role=self.admin_role,
        )
        self.member = CustomUser.objects.create_user(
            email='member@example.com',
            password='MemberPass123!@',
            first_name='Member',
            last_name='User',
            role=self.member_role,
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

    def test_member_cannot_list_users(self):
        self._login('member@example.com', 'MemberPass123!@')
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
            'password': 'InvitedPass1!@#',
            'role_id': str(self.member_role.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(email='invited@example.com').exists())


class PermissionsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.qomita_role = Role.objects.create(name=Role.QOMITA_RAHBAR)
        self.leader_role = Role.objects.create(name=Role.CONFESSION_LEADER)
        self.member_role = Role.objects.create(name=Role.MEMBER)
        self.auditor_role = Role.objects.create(name=Role.SECURITY_AUDITOR)
        self.psych_role = Role.objects.create(name=Role.PSYCHOLOGIST)
        self.it_admin_role = Role.objects.create(name=Role.IT_ADMIN)

    def _create_and_login(self, email, role):
        user = CustomUser.objects.create_user(
            email=email,
            password='TestPass123!@#',
            first_name='Test',
            last_name='User',
            role=role,
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

    def test_qomita_rahbar_denied_users(self):
        self._create_and_login('qr@test.com', self.qomita_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_confession_leader_denied_users(self):
        self._create_and_login('cl@test.com', self.leader_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_denied_users(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_security_auditor_can_access_audit_logs(self):
        self._create_and_login('aud@test.com', self.auditor_role)
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_security_auditor_can_access_anomaly_reports(self):
        self._create_and_login('aud@test.com', self.auditor_role)
        response = self.client.get('/api/ai-security/anomaly-reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_it_admin_can_access_ai_configs(self):
        self._create_and_login('it@test.com', self.it_admin_role)
        response = self.client.get('/api/ai-security/ai-configs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_psychologist_can_access_confessions(self):
        self._create_and_login('psych@test.com', self.psych_role)
        response = self.client.get('/api/confessions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_security_auditor_can_access_documents(self):
        self._create_and_login('aud@test.com', self.auditor_role)
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProfileViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='profile@example.com',
            password='TestPass123!@#',
            first_name='Profile',
            last_name='User',
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
    def test_seed_roles_creates_seven_roles(self):
        call_command('seed_roles')
        self.assertEqual(Role.objects.count(), 7)
        self.assertTrue(Role.objects.filter(name='super_admin').exists())
        self.assertTrue(Role.objects.filter(name='qomita_rahbar').exists())
        self.assertTrue(Role.objects.filter(name='confession_leader').exists())
        self.assertTrue(Role.objects.filter(name='member').exists())
        self.assertTrue(Role.objects.filter(name='security_auditor').exists())
        self.assertTrue(Role.objects.filter(name='psychologist').exists())
        self.assertTrue(Role.objects.filter(name='it_admin').exists())

    def test_seed_roles_idempotent(self):
        call_command('seed_roles')
        call_command('seed_roles')
        self.assertEqual(Role.objects.count(), 7)


class SeedDataCommandTest(TestCase):
    def test_seed_data_creates_users(self):
        call_command('seed_data')
        self.assertTrue(CustomUser.objects.filter(email='admin@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='member@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='auditor@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='psychologist@scp.local').exists())
        self.assertTrue(CustomUser.objects.filter(email='itadmin@scp.local').exists())
        self.assertEqual(Role.objects.count(), 7)

    def test_seed_data_idempotent(self):
        call_command('seed_data')
        count = CustomUser.objects.count()
        call_command('seed_data')
        self.assertEqual(CustomUser.objects.count(), count)


class HealthCheckTest(APITestCase):
    def test_health_check_returns_status(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.json())
        self.assertIn('services', response.json())
        self.assertEqual(response.json()['services']['database'], 'ok')
