from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Organization


class OrganizationTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.qomita_role = Role.objects.create(name=Role.QOMITA_RAHBAR)
        self.konfessiya_role = Role.objects.create(name=Role.KONFESSIYA_RAHBARI)
        self.dt_rahbar_role = Role.objects.create(name=Role.DT_RAHBAR)
        self.dt_xodimi_role = Role.objects.create(name=Role.DT_XODIMI)

    def _create_and_login(self, email, role, confession=None):
        user = CustomUser.objects.create_user(
            email=email, password='TestPass123!@#',
            first_name='Test', last_name='User', role=role,
            confession=confession,
        )
        response = self.client.post('/api/accounts/login/', {
            'email': email, 'password': 'TestPass123!@#',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return user


class OrganizationHierarchyTest(OrganizationTestBase):
    def test_super_admin_can_create_qomita(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Test Qomita', 'org_type': 'qomita',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['org_type'], 'qomita')

    def test_qomita_rahbar_can_create_konfessiya(self):
        qomita = Organization.objects.create(name='Qomita', org_type='qomita')
        self._create_and_login('qr@test.com', self.qomita_role, confession=qomita)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Test Konfessiya', 'org_type': 'konfessiya', 'parent': str(qomita.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['org_type'], 'konfessiya')

    def test_konfessiya_rahbari_can_create_dt(self):
        qomita = Organization.objects.create(name='Qomita', org_type='qomita')
        konfessiya = Organization.objects.create(name='Konfessiya', org_type='konfessiya', parent=qomita)
        self._create_and_login('kr@test.com', self.konfessiya_role, confession=konfessiya)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Test DT', 'org_type': 'diniy_tashkilot', 'parent': str(konfessiya.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dt_xodimi_cannot_create_organization(self):
        qomita = Organization.objects.create(name='Qomita', org_type='qomita')
        konfessiya = Organization.objects.create(name='Konfessiya', org_type='konfessiya', parent=qomita)
        dt = Organization.objects.create(name='DT', org_type='diniy_tashkilot', parent=konfessiya)
        self._create_and_login('dx@test.com', self.dt_xodimi_role, confession=dt)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Nope', 'org_type': 'qomita',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organization_hierarchy_validation(self):
        """Konfessiya must have qomita parent."""
        self.assertRaises(
            Exception,
            Organization.objects.create,
            name='Invalid', org_type='konfessiya', parent=None,
        )


class OrganizationCRUDTest(OrganizationTestBase):
    def test_super_admin_can_list_all_organizations(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        Organization.objects.create(name='Org1', org_type='qomita')
        response = self.client.get('/api/confessions/organizations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_super_admin_can_delete_organization(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        org = Organization.objects.create(name='To Delete', org_type='qomita')
        response = self.client.delete(f'/api/confessions/organizations/{org.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class DashboardStatsTest(OrganizationTestBase):
    def test_authenticated_gets_stats(self):
        qomita = Organization.objects.create(name='Q', org_type='qomita')
        self._create_and_login('sa@test.com', self.super_admin_role, confession=qomita)
        response = self.client.get('/api/confessions/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('documents', response.data)
        self.assertIn('notifications', response.data)
        self.assertIn('organizations', response.data)

    def test_unauthenticated_denied(self):
        self.client.credentials()
        response = self.client.get('/api/confessions/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
