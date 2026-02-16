from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from notifications.models import Notification, AlertConfig


class NotificationTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
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
        user1 = self._create_and_login('u1@test.com', self.member_role)
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
