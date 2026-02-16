from unittest.mock import patch, MagicMock
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from notifications.models import Notification, AlertConfig, AlertRule, TelegramConfig


class NotificationTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.member_role = Role.objects.create(name=Role.MEMBER)
        self.it_admin_role = Role.objects.create(name=Role.IT_ADMIN)

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


class NotificationVisibilityTest(NotificationTestBase):
    def test_user_sees_only_own_notifications(self):
        user1 = self._create_and_login('u1@test.com', self.member_role)
        user2 = CustomUser.objects.create_user(
            email='u2@test.com', password='TestPass123!@#',
            first_name='U2', last_name='T', role=self.member_role,
        )
        Notification.objects.create(
            recipient=user1, title='For me', message='m',
        )
        Notification.objects.create(
            recipient=user2, title='Not for me', message='m',
        )
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'For me')

    def test_user_can_delete_own_notification(self):
        user = self._create_and_login('u@test.com', self.member_role)
        notif = Notification.objects.create(
            recipient=user, title='N', message='m',
        )
        response = self.client.delete(f'/api/notifications/{notif.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_user_cannot_delete_others_notification(self):
        self._create_and_login('u1@test.com', self.member_role)
        user2 = CustomUser.objects.create_user(
            email='u2@test.com', password='TestPass123!@#',
            first_name='U2', last_name='T', role=self.member_role,
        )
        notif = Notification.objects.create(
            recipient=user2, title='N', message='m',
        )
        response = self.client.delete(f'/api/notifications/{notif.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MarkReadTest(NotificationTestBase):
    def test_mark_specific_as_read(self):
        user = self._create_and_login('u@test.com', self.member_role)
        n1 = Notification.objects.create(recipient=user, title='N1', message='m')
        n2 = Notification.objects.create(recipient=user, title='N2', message='m')
        response = self.client.post('/api/notifications/mark-read/', {
            'ids': [str(n1.id)],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 1)
        n1.refresh_from_db()
        n2.refresh_from_db()
        self.assertTrue(n1.is_read)
        self.assertFalse(n2.is_read)

    def test_mark_all_as_read(self):
        user = self._create_and_login('u@test.com', self.member_role)
        Notification.objects.create(recipient=user, title='N1', message='m')
        Notification.objects.create(recipient=user, title='N2', message='m')
        response = self.client.post('/api/notifications/mark-read/', {
            'all': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 2)

    def test_unread_count(self):
        user = self._create_and_login('u@test.com', self.member_role)
        Notification.objects.create(recipient=user, title='N1', message='m')
        Notification.objects.create(recipient=user, title='N2', message='m', is_read=True)
        response = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)


class AlertConfigTest(NotificationTestBase):
    def test_admin_can_create_alert_config(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/notifications/alert-configs/', {
            'name': 'Alert', 'threshold': 10,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_create_alert_config(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/notifications/alert-configs/', {
            'name': 'Nope', 'threshold': 10,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_alert_configs(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        AlertConfig.objects.create(name='AC', threshold=5, created_by=admin)
        response = self.client.get('/api/notifications/alert-configs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_update_alert_config(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        ac = AlertConfig.objects.create(name='Old', threshold=5, created_by=admin)
        response = self.client.patch(f'/api/notifications/alert-configs/{ac.id}/', {
            'name': 'New',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ac.refresh_from_db()
        self.assertEqual(ac.name, 'New')

    def test_admin_can_delete_alert_config(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        ac = AlertConfig.objects.create(name='Del', threshold=5, created_by=admin)
        response = self.client.delete(f'/api/notifications/alert-configs/{ac.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class AlertRuleTest(NotificationTestBase):
    def test_admin_can_create_alert_rule(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/notifications/alert-rules/', {
            'name': 'High Anomalies',
            'condition_type': 'anomaly_count',
            'threshold': 5,
            'action': 'all',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_it_admin_can_create_alert_rule(self):
        self._create_and_login('it@test.com', self.it_admin_role)
        response = self.client.post('/api/notifications/alert-rules/', {
            'name': 'Failed Logins',
            'condition_type': 'failed_logins',
            'threshold': 10,
            'action': 'telegram',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_create_alert_rule(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/notifications/alert-rules/', {
            'name': 'Nope',
            'condition_type': 'anomaly_count',
            'threshold': 1,
            'action': 'notification',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_alert_rules(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        AlertRule.objects.create(
            name='Rule', condition_type='anomaly_count',
            threshold=5, action='all', created_by=admin,
        )
        response = self.client.get('/api/notifications/alert-rules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_alert_rule(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        rule = AlertRule.objects.create(
            name='Del', condition_type='anomaly_count',
            threshold=5, action='all', created_by=admin,
        )
        response = self.client.delete(f'/api/notifications/alert-rules/{rule.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class TelegramConfigTest(NotificationTestBase):
    def test_get_telegram_config_not_configured(self):
        self._create_and_login('u@test.com', self.member_role)
        response = self.client.get('/api/notifications/telegram-config/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_telegram_config(self):
        user = self._create_and_login('u@test.com', self.member_role)
        response = self.client.put('/api/notifications/telegram-config/', {
            'chat_id': '12345',
            'alert_types': ['anomaly', 'honeypot'],
        }, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(TelegramConfig.objects.count(), 1)

    def test_update_telegram_config(self):
        user = self._create_and_login('u@test.com', self.member_role)
        TelegramConfig.objects.create(user=user, chat_id='111')
        response = self.client.put('/api/notifications/telegram-config/', {
            'chat_id': '222',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        config = TelegramConfig.objects.get(user=user)
        self.assertEqual(config.chat_id, '222')


class TelegramBotTest(NotificationTestBase):
    @patch('notifications.telegram.requests.post')
    def test_send_message(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        mock_post.return_value.json.return_value = {'ok': True}
        mock_post.return_value.raise_for_status = MagicMock()

        from notifications.telegram import TelegramBot
        bot = TelegramBot(token='test-token')
        result = bot.send_message('12345', 'Hello')
        mock_post.assert_called_once()
        self.assertIsNotNone(result)

    def test_send_message_no_token(self):
        from notifications.telegram import TelegramBot
        bot = TelegramBot(token='')
        result = bot.send_message('12345', 'Hello')
        self.assertIsNone(result)

    @patch('notifications.telegram.requests.post')
    def test_send_alert(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        mock_post.return_value.json.return_value = {'ok': True}
        mock_post.return_value.raise_for_status = MagicMock()

        from notifications.telegram import TelegramBot
        bot = TelegramBot(token='test-token')
        result = bot.send_alert('12345', 'Test Alert', 'Message', 'critical')
        mock_post.assert_called_once()


class AlertEngineTest(NotificationTestBase):
    def test_check_thresholds_no_rules(self):
        from notifications.alerting import AlertEngine
        engine = AlertEngine()
        engine.check_thresholds()  # Should not raise

    def test_should_alert_no_previous_trigger(self):
        from notifications.alerting import AlertEngine
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        rule = AlertRule.objects.create(
            name='Test', condition_type='anomaly_count',
            threshold=0, action='notification', created_by=admin,
        )
        engine = AlertEngine()
        self.assertTrue(engine.should_alert(rule))

    def test_rate_limiting(self):
        from django.utils import timezone
        from notifications.alerting import AlertEngine
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        rule = AlertRule.objects.create(
            name='Test', condition_type='anomaly_count',
            threshold=0, action='notification', created_by=admin,
            last_triggered_at=timezone.now(),
        )
        engine = AlertEngine()
        self.assertFalse(engine.should_alert(rule))
