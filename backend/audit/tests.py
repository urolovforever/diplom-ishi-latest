from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Confession, Organization
from audit.models import AuditLog, Report
from audit.reports import ReportGenerator


class AuditTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.konfessiya_rahbari_role = Role.objects.create(name=Role.KONFESSIYA_RAHBARI)
        self.konfessiya_xodimi_role = Role.objects.create(name=Role.KONFESSIYA_XODIMI)
        self.dt_rahbar_role = Role.objects.create(name=Role.DT_RAHBAR)
        self.dt_xodimi_role = Role.objects.create(name=Role.DT_XODIMI)

        # Create confession + organization hierarchy
        self.confession = Confession.objects.create(name='Test Confession')
        self.org = Organization.objects.create(
            name='Test Org', confession=self.confession,
        )

    def _create_and_login(self, email, role, confession=None, organization=None):
        user = CustomUser.objects.create_user(
            email=email, password='TestPass123!@#',
            first_name='Test', last_name='User', role=role,
            confession=confession, organization=organization,
            is_2fa_enabled=False,
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

    def test_konfessiya_rahbari_can_list_audit_logs(self):
        self._create_and_login(
            'kr@test.com', self.konfessiya_rahbari_role,
            confession=self.confession,
        )
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dt_xodimi_cannot_list_audit_logs(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.get('/api/audit/logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_konfessiya_xodimi_cannot_list_audit_logs(self):
        self._create_and_login(
            'kx@test.com', self.konfessiya_xodimi_role,
            confession=self.confession,
        )
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
            'name': 'Test Org 2',
            'confession': str(self.confession.id),
        })
        self.assertEqual(AuditLog.objects.count(), initial_count + 1)
        log = AuditLog.objects.order_by('-created_at').first()
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.model_name, 'Organization')

    def test_organization_update_creates_audit_log(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        org = Organization.objects.create(
            name='Org to Update', confession=self.confession,
        )
        initial_count = AuditLog.objects.count()
        self.client.patch(f'/api/confessions/organizations/{org.id}/', {
            'name': 'Updated',
        })
        self.assertGreater(AuditLog.objects.count(), initial_count)

    def test_organization_delete_creates_audit_log(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        org = Organization.objects.create(
            name='To Delete', confession=self.confession,
        )
        initial_count = AuditLog.objects.count()
        self.client.delete(f'/api/confessions/organizations/{org.id}/')
        self.assertGreater(AuditLog.objects.count(), initial_count)
        log = AuditLog.objects.order_by('-created_at').first()
        self.assertEqual(log.action, 'delete')


class ReportGeneratorTest(AuditTestBase):
    def test_activity_report(self):
        data = ReportGenerator.activity_report()
        self.assertEqual(data['title'], 'Activity Report')
        self.assertIn('total_requests', data)
        self.assertIn('by_method', data)

    def test_security_report(self):
        data = ReportGenerator.security_report()
        self.assertEqual(data['title'], 'Security Report')
        self.assertIn('total_anomalies', data)
        self.assertIn('failed_login_attempts', data)

    def test_organization_report(self):
        data = ReportGenerator.organization_report()
        self.assertEqual(data['title'], 'Organization Report')
        self.assertIn('total_organizations', data)
        self.assertIn('active_count', data)

    def test_export_pdf(self):
        data = ReportGenerator.activity_report()
        pdf_bytes = ReportGenerator.export_pdf(data)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 0)
        # PDF starts with %PDF
        self.assertTrue(pdf_bytes[:4] == b'%PDF')

    def test_security_report_pdf(self):
        data = ReportGenerator.security_report()
        pdf_bytes = ReportGenerator.export_pdf(data)
        self.assertTrue(pdf_bytes[:4] == b'%PDF')


class ReportViewTest(AuditTestBase):
    def test_admin_can_generate_report(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/audit/reports/', {
            'report_type': 'activity',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['report_type'], 'activity')

    def test_konfessiya_rahbari_can_generate_report(self):
        self._create_and_login(
            'kr@test.com', self.konfessiya_rahbari_role,
            confession=self.confession,
        )
        response = self.client.post('/api/audit/reports/', {
            'report_type': 'security',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dt_xodimi_cannot_generate_report(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/audit/reports/', {
            'report_type': 'activity',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_reports(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        Report.objects.create(
            title='Activity Report', report_type='activity',
            data={'title': 'Test'}, generated_by=admin,
        )
        response = self.client.get('/api/audit/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_download_report_pdf(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        report = Report.objects.create(
            title='Activity Report', report_type='activity',
            data={
                'title': 'Activity Report',
                'total_requests': 100,
                'period': {'from': '2024-01-01', 'to': '2024-12-31'},
            },
            generated_by=admin,
        )
        response = self.client.get(f'/api/audit/reports/{report.id}/download/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_download_nonexistent_report(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/audit/reports/00000000-0000-0000-0000-000000000000/download/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_generate_all_report_types(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        for report_type in ['activity', 'security', 'organization']:
            response = self.client.post('/api/audit/reports/', {
                'report_type': report_type,
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, f'Failed for {report_type}')
