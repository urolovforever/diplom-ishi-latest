from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from audit.models import AuditLog


class AuditTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.qomita_role = Role.objects.create(name=Role.QOMITA_RAHBAR)
        self.member_role = Role.objects.create(name=Role.MEMBER)

    def _create_and_login(self, email, role):
        user = CustomUser.objects.create_user(
            email=email, password='TestPass123!@#',
            first_name='Test', last_name='User', role=role,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': email, 'password': 'TestPass123!@#',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return user


class AuditLogPermissionTest(AuditTestBase):
    def test_super_admin_can_list_audit_logs(self):
        user = self._create_and_login('sa@test.com', self.super_admin_role)
        AuditLog.objects.create(
            user=user, action='create', model_name='Test', object_id='1',
        )
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_qomita_cannot_list_audit_logs(self):
        self._create_and_login('qr@test.com', self.qomita_role)
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_list_audit_logs(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_audit_logs(self):
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_audit_log_is_read_only(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/audit/logs/', {
            'action': 'create', 'model_name': 'Test', 'object_id': '1',
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_filter_by_action(self):
        user = self._create_and_login('sa@test.com', self.super_admin_role)
        AuditLog.objects.create(
            user=user, action='create', model_name='Test', object_id='1',
        )
        AuditLog.objects.create(
            user=user, action='delete', model_name='Test', object_id='2',
        )
        response = self.client.get('/api/audit/logs/?action=create')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for entry in response.data['results']:
            self.assertEqual(entry['action'], 'create')

    def test_filter_by_model_name(self):
        user = self._create_and_login('sa@test.com', self.super_admin_role)
        AuditLog.objects.create(
            user=user, action='create', model_name='Organization', object_id='1',
        )
        AuditLog.objects.create(
            user=user, action='create', model_name='Confession', object_id='2',
        )
        response = self.client.get('/api/audit/logs/?model_name=Organization')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for entry in response.data['results']:
            self.assertEqual(entry['model_name'], 'Organization')


class AuditMixinTest(AuditTestBase):
    def test_organization_create_creates_audit_log(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        initial_count = AuditLog.objects.count()
        self.client.post('/api/confessions/organizations/', {
            'name': 'Test Org',
        })
        self.assertEqual(AuditLog.objects.count(), initial_count + 1)
        log = AuditLog.objects.order_by('-created_at').first()
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.model_name, 'Organization')

    def test_organization_update_creates_audit_log(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        from confessions.models import Organization
        org = Organization.objects.create(name='Org')
        initial_count = AuditLog.objects.count()
        self.client.patch(f'/api/confessions/organizations/{org.id}/', {
            'name': 'Updated',
        })
        self.assertGreater(AuditLog.objects.count(), initial_count)

    def test_organization_delete_creates_audit_log(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        from confessions.models import Organization
        org = Organization.objects.create(name='To Delete')
        initial_count = AuditLog.objects.count()
        self.client.delete(f'/api/confessions/organizations/{org.id}/')
        self.assertGreater(AuditLog.objects.count(), initial_count)
        log = AuditLog.objects.order_by('-created_at').first()
        self.assertEqual(log.action, 'delete')
