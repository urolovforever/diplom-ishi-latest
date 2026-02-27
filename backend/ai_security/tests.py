from unittest.mock import patch
from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Confession, Organization
from ai_security.models import ActivityLog, AnomalyReport, AIModelConfig
from ai_security.features import extract_user_features, features_to_vector, FEATURE_NAMES
from ai_security.engine import IsolationForestEngine


class AISecurityTestBase(APITestCase):
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


class FeatureExtractionTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='feat@test.com', password='TestPass123!@#',
            first_name='F', last_name='E',
        )

    def test_extract_features_no_logs(self):
        features = extract_user_features(self.user)
        self.assertEqual(features['failed_logins'], 0)
        self.assertEqual(features['docs_accessed'], 0)
        self.assertEqual(features['download_mb'], 0.0)

    def test_extract_features_with_logs(self):
        for i in range(10):
            ActivityLog.objects.create(
                user=self.user,
                action=f'GET /api/documents/{i}/',
                request_path=f'/api/documents/{i}/',
                request_method='GET',
                response_status=200,
            )
        ActivityLog.objects.create(
            user=self.user,
            action='GET /api/error/',
            request_path='/api/error/',
            request_method='GET',
            response_status=500,
        )

        features = extract_user_features(self.user)
        self.assertEqual(features['docs_accessed'], 10)
        self.assertIsInstance(features['session_duration_min'], float)
        self.assertIsInstance(features['own_section'], float)

    def test_features_to_vector(self):
        features = {
            'failed_logins': 10,
            'docs_accessed': 5,
            'session_duration_min': 14.0,
            'day_of_week': 2,
            'download_mb': 0.1,
            'own_section': 1.0,
            'role': 3,
            'entity_type': 2,
            'is_anomaly': 0.0,
        }
        vector = features_to_vector(features)
        self.assertEqual(len(vector), len(FEATURE_NAMES))
        self.assertEqual(vector[0], 10)
        self.assertEqual(vector[1], 5)

    def test_feature_names_count(self):
        self.assertEqual(len(FEATURE_NAMES), 9)


class IsolationForestEngineTest(TestCase):
    def test_train_with_enough_data(self):
        import numpy as np
        engine = IsolationForestEngine()
        np.random.seed(42)
        data = np.random.randn(50, 9).tolist()
        result = engine.train(data)
        self.assertTrue(result)
        self.assertIsNotNone(engine.model)

    def test_train_with_too_few_samples(self):
        engine = IsolationForestEngine()
        data = [[1, 2, 3, 4, 5, 6, 7, 8, 9] for _ in range(5)]
        result = engine.train(data)
        self.assertFalse(result)

    def test_predict_after_training(self):
        import numpy as np
        engine = IsolationForestEngine()
        np.random.seed(42)
        data = np.random.randn(50, 9).tolist()
        engine.train(data)
        score = engine.predict([0, 0, 0, 0, 0, 0, 0, 0, 0])
        self.assertIsInstance(score, float)

    def test_predict_without_training_raises(self):
        engine = IsolationForestEngine()
        with self.assertRaises(ValueError):
            engine.predict([0, 0, 0, 0, 0, 0, 0, 0, 0])

    def test_is_anomaly(self):
        import numpy as np
        engine = IsolationForestEngine()
        np.random.seed(42)
        data = np.random.randn(100, 9).tolist()
        engine.train(data)
        # Normal point
        score_normal = engine.predict([0, 0, 0, 0, 0, 0, 0, 0, 0])
        # Extreme outlier
        score_outlier = engine.predict([100, 100, 100, 100, 100, 100, 100, 100, 100])
        self.assertGreater(score_normal, score_outlier)

    def test_save_and_load(self):
        import numpy as np
        import tempfile
        import os
        engine = IsolationForestEngine()
        np.random.seed(42)
        data = np.random.randn(50, 9).tolist()
        engine.train(data)

        with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as f:
            filepath = f.name
        try:
            engine.save(filepath)
            engine2 = IsolationForestEngine()
            engine2.load(filepath)
            score1 = engine.predict([1, 2, 3, 4, 5, 6, 7, 8, 9])
            score2 = engine2.predict([1, 2, 3, 4, 5, 6, 7, 8, 9])
            self.assertAlmostEqual(score1, score2, places=6)
        finally:
            os.unlink(filepath)

    def test_load_nonexistent_file(self):
        engine = IsolationForestEngine()
        result = engine.load('/nonexistent/path.joblib')
        self.assertFalse(result)

    def test_explain_features(self):
        import numpy as np
        engine = IsolationForestEngine()
        np.random.seed(42)
        data = np.random.randn(50, 9).tolist()
        engine.train(data)
        explanations = engine.explain_features([1, 2, 3, 4, 5, 6, 7, 8, 9])
        self.assertEqual(len(explanations), 9)
        for name in FEATURE_NAMES:
            self.assertIn(name, explanations)
            self.assertIn('contribution', explanations[name])
            self.assertIn('value', explanations[name])


class ActivityLogTest(AISecurityTestBase):
    def test_konfessiya_rahbari_can_list_activity_logs(self):
        user = self._create_and_login(
            'kr@test.com', self.konfessiya_rahbari_role,
            confession=self.confession,
        )
        ActivityLog.objects.create(
            user=user, action='GET /api/test/', resource='/api/test/',
        )
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_super_admin_can_list_activity_logs(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dt_xodimi_cannot_list_activity_logs(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dt_rahbar_cannot_list_activity_logs(self):
        self._create_and_login(
            'dr@test.com', self.dt_rahbar_role,
            organization=self.org,
        )
        response = self.client.get('/api/ai-security/activity-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activity_log_is_read_only(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/ai-security/activity-logs/', {
            'action': 'test',
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_search_activity_logs(self):
        user = self._create_and_login(
            'kr@test.com', self.konfessiya_rahbari_role,
            confession=self.confession,
        )
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

    def test_dt_xodimi_cannot_create_anomaly_report(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/ai-security/anomaly-reports/', {
            'title': 'Nope', 'description': 'No', 'severity': 'low',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_anomaly_reports(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/ai-security/anomaly-reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_konfessiya_rahbari_can_list_anomaly_reports(self):
        self._create_and_login(
            'kr@test.com', self.konfessiya_rahbari_role,
            confession=self.confession,
        )
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

    def test_review_anomaly(self):
        user = self._create_and_login('sa@test.com', self.super_admin_role)
        report = AnomalyReport.objects.create(
            title='Review me', description='d', severity='high',
        )
        response = self.client.post(f'/api/ai-security/anomaly-reports/{report.id}/review/', {
            'is_false_positive': False,
            'resolve': True,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertTrue(report.is_resolved)
        self.assertIsNotNone(report.reviewed_by)
        self.assertIsNotNone(report.reviewed_at)

    def test_review_anomaly_false_positive(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        report = AnomalyReport.objects.create(
            title='FP', description='d', severity='low',
        )
        response = self.client.post(f'/api/ai-security/anomaly-reports/{report.id}/review/', {
            'is_false_positive': True,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertTrue(report.is_false_positive)


class AIModelConfigTest(AISecurityTestBase):
    def test_admin_can_create_config(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/ai-security/ai-configs/', {
            'name': 'Config', 'model_type': 'anomaly_detection',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_konfessiya_xodimi_can_create_config(self):
        """Konfessiya xodimi has access to AI configs (mapped from old it_admin role)."""
        self._create_and_login(
            'kx@test.com', self.konfessiya_xodimi_role,
            confession=self.confession,
        )
        response = self.client.post('/api/ai-security/ai-configs/', {
            'name': 'Config', 'model_type': 'anomaly_detection',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dt_xodimi_cannot_create_config(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
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


class DashboardViewTest(AISecurityTestBase):
    def test_admin_can_access_dashboard(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/ai-security/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_anomalies', response.data)
        self.assertIn('unreviewed_count', response.data)

    def test_konfessiya_rahbari_can_access_dashboard(self):
        self._create_and_login(
            'kr@test.com', self.konfessiya_rahbari_role,
            confession=self.confession,
        )
        response = self.client.get('/api/ai-security/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dt_xodimi_cannot_access_dashboard(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.get('/api/ai-security/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ManualScanViewTest(AISecurityTestBase):
    @patch('ai_security.tasks.scan_recent_activity.delay')
    def test_admin_can_trigger_scan(self, mock_delay):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/ai-security/scan/')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        mock_delay.assert_called_once()

    def test_dt_xodimi_cannot_trigger_scan(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/ai-security/scan/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ScanTaskTest(TestCase):
    @patch('ai_security.engine.IsolationForestEngine.load')
    def test_scan_no_model_skips(self, mock_load):
        from ai_security.tasks import scan_recent_activity
        scan_recent_activity()
        mock_load.assert_not_called()

    def test_cleanup_old_logs(self):
        from ai_security.tasks import cleanup_old_logs
        old_log = ActivityLog.objects.create(
            action='old', request_path='/old',
        )
        ActivityLog.objects.filter(pk=old_log.pk).update(
            created_at=timezone.now() - timedelta(days=731)
        )
        recent_log = ActivityLog.objects.create(
            action='recent', request_path='/recent',
        )
        cleanup_old_logs()
        self.assertFalse(ActivityLog.objects.filter(pk=old_log.pk).exists())
        self.assertTrue(ActivityLog.objects.filter(pk=recent_log.pk).exists())
