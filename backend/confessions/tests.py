from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Confession, Organization


class OrganizationTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.konfessiya_role = Role.objects.create(name=Role.KONFESSIYA_RAHBARI)
        self.konfessiya_xodimi_role = Role.objects.create(name=Role.KONFESSIYA_XODIMI)
        self.dt_rahbar_role = Role.objects.create(name=Role.DT_RAHBAR)
        self.dt_xodimi_role = Role.objects.create(name=Role.DT_XODIMI)

        # Create a confession and organization for reuse
        self.confession = Confession.objects.create(name='Test Confession')
        self.org = Organization.objects.create(
            name='Test Organization', confession=self.confession,
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


class OrganizationHierarchyTest(OrganizationTestBase):
    def test_super_admin_can_create_organization(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'New Org', 'confession': str(self.confession.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_konfessiya_rahbari_can_create_organization(self):
        self._create_and_login(
            'kr@test.com', self.konfessiya_role,
            confession=self.confession,
        )
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'New Org 2', 'confession': str(self.confession.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dt_xodimi_cannot_create_organization(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Nope', 'confession': str(self.confession.id),
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dt_rahbar_cannot_create_organization(self):
        """DT rahbar can list but should be denied create by perform_create logic."""
        self._create_and_login(
            'dr@test.com', self.dt_rahbar_role,
            organization=self.org,
        )
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Nope', 'confession': str(self.confession.id),
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OrganizationCRUDTest(OrganizationTestBase):
    def test_super_admin_can_list_all_organizations(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/confessions/organizations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_super_admin_can_delete_organization(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        org = Organization.objects.create(
            name='To Delete', confession=self.confession,
        )
        response = self.client.delete(f'/api/confessions/organizations/{org.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_konfessiya_rahbari_sees_own_confession_organizations(self):
        other_confession = Confession.objects.create(name='Other Confession')
        Organization.objects.create(name='Other Org', confession=other_confession)
        self._create_and_login(
            'kr@test.com', self.konfessiya_role,
            confession=self.confession,
        )
        response = self.client.get('/api/confessions/organizations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see organizations from own confession
        for org in response.data.get('results', response.data):
            self.assertEqual(str(org['confession']), str(self.confession.id))


class DashboardStatsTest(OrganizationTestBase):
    def test_authenticated_gets_stats(self):
        self._create_and_login(
            'sa@test.com', self.super_admin_role,
            confession=self.confession,
        )
        response = self.client.get('/api/confessions/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('documents', response.data)
        self.assertIn('notifications', response.data)
        self.assertIn('organizations', response.data)

    def test_unauthenticated_denied(self):
        self.client.credentials()
        response = self.client.get('/api/confessions/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
