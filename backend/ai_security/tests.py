from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from ai_security.models import ActivityLog, AnomalyReport, AIModelConfig


class AISecurityTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.qomita_role = Role.objects.create(name=Role.QOMITA_RAHBAR)
        self.leader_role = Role.objects.create(name=Role.CONFESSION_LEADER)
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


class ActivityLogTest(AISecurityTestBase):
    def test_qomita_can_list_activity_logs(self):
        user = self._create_and_login('qr@test.com', self.qomita_role)
        ActivityLog.objects.create(
            user=user, action='GET /api/test/', resource='/api/test/',
        )
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_super_admin_can_list_activity_logs(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_cannot_list_activity_logs(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_cannot_list_activity_logs(self):
        self._create_and_login('cl@test.com', self.leader_role)
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activity_log_is_read_only(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        # No POST endpoint for activity logs
        response = self.client.post('/api/ai-security/activity-logs/', {
            'action': 'test',
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_search_activity_logs(self):
        user = self._create_and_login('qr@test.com', self.qomita_role)
        ActivityLog.objects.create(user=user, action='GET /api/test/', resource='/api/test/')
        ActivityLog.objects.create(user=user, action='POST /api/other/', resource='/api/other/')
        response = self.client.get('/api/ai-security/activity-logs/?search=test')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AnomalyReportTest(AISecurityTestBase):
    def test_admin_can_create_anomaly_report(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/ai-security/anomaly-reports/', {
            'title': 'Anomaly', 'description': 'Something weird',
            'severity': 'high',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_create_anomaly_report(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/ai-security/anomaly-reports/', {
            'title': 'Nope', 'description': 'No', 'severity': 'low',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_anomaly_reports(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/ai-security/anomaly-reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_update_anomaly_report(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        report = AnomalyReport.objects.create(
            title='Old', description='d', severity='low',
        )
        response = self.client.patch(f'/api/ai-security/anomaly-reports/{report.id}/', {
            'title': 'Updated',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.title, 'Updated')

    def test_admin_can_delete_anomaly_report(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        report = AnomalyReport.objects.create(
            title='Del', description='d', severity='low',
        )
        response = self.client.delete(f'/api/ai-security/anomaly-reports/{report.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class AIModelConfigTest(AISecurityTestBase):
    def test_admin_can_create_config(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/ai-security/ai-configs/', {
            'name': 'Config', 'model_type': 'anomaly_detection',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_create_config(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/ai-security/ai-configs/', {
            'name': 'Nope', 'model_type': 'test',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_configs(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        AIModelConfig.objects.create(name='C1', model_type='test')
        response = self.client.get('/api/ai-security/ai-configs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_update_config(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        config = AIModelConfig.objects.create(name='Old', model_type='test')
        response = self.client.patch(f'/api/ai-security/ai-configs/{config.id}/', {
            'name': 'New',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        config.refresh_from_db()
        self.assertEqual(config.name, 'New')

    def test_admin_can_delete_config(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        config = AIModelConfig.objects.create(name='Del', model_type='test')
        response = self.client.delete(f'/api/ai-security/ai-configs/{config.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
