from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Organization, Confession


class ConfessionTestBase(APITestCase):
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


class OrganizationCRUDTest(ConfessionTestBase):
    def test_qomita_can_create_organization(self):
        self._create_and_login('qr@test.com', self.qomita_role)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Test Org', 'description': 'Desc',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Org')

    def test_super_admin_can_create_organization(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Admin Org',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_create_organization(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Nope',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_cannot_create_organization(self):
        self._create_and_login('cl@test.com', self.leader_role)
        response = self.client.post('/api/confessions/organizations/', {
            'name': 'Nope',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_qomita_can_list_organizations(self):
        self._create_and_login('qr@test.com', self.qomita_role)
        Organization.objects.create(name='Org1')
        response = self.client.get('/api/confessions/organizations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_qomita_can_update_organization(self):
        self._create_and_login('qr@test.com', self.qomita_role)
        org = Organization.objects.create(name='Old Name')
        response = self.client.patch(f'/api/confessions/organizations/{org.id}/', {
            'name': 'New Name',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        org.refresh_from_db()
        self.assertEqual(org.name, 'New Name')

    def test_qomita_can_delete_organization(self):
        self._create_and_login('qr@test.com', self.qomita_role)
        org = Organization.objects.create(name='To Delete')
        response = self.client.delete(f'/api/confessions/organizations/{org.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class ConfessionCRUDTest(ConfessionTestBase):
    def setUp(self):
        super().setUp()
        self.org = Organization.objects.create(name='Test Org')

    def test_member_can_create_confession(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/confessions/', {
            'title': 'My Confession', 'content': 'Content here',
            'organization': str(self.org.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'My Confession')

    def test_member_sees_only_own_confessions(self):
        member1 = self._create_and_login('m1@test.com', self.member_role)
        Confession.objects.create(
            title='Mine', content='c', author=member1, organization=self.org,
        )
        member2 = CustomUser.objects.create_user(
            email='m2@test.com', password='TestPass123!@#',
            first_name='M2', last_name='U', role=self.member_role,
        )
        Confession.objects.create(
            title='Theirs', content='c', author=member2, organization=self.org,
        )
        response = self.client.get('/api/confessions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Mine')

    def test_admin_sees_all_confessions(self):
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        Confession.objects.create(
            title='C1', content='c', author=member, organization=self.org,
        )
        Confession.objects.create(
            title='C2', content='c', author=member, organization=self.org,
        )
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/confessions/')
        self.assertEqual(len(response.data['results']), 2)

    def test_leader_sees_org_confessions(self):
        leader = self._create_and_login('cl@test.com', self.leader_role)
        self.org.leader = leader
        self.org.save()
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        Confession.objects.create(
            title='In my org', content='c', author=member, organization=self.org,
        )
        other_org = Organization.objects.create(name='Other Org')
        Confession.objects.create(
            title='Not my org', content='c', author=member, organization=other_org,
        )
        response = self.client.get('/api/confessions/')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'In my org')

    def test_author_can_edit_own_draft(self):
        member = self._create_and_login('m@test.com', self.member_role)
        confession = Confession.objects.create(
            title='Draft', content='c', author=member,
            organization=self.org, status='draft',
        )
        response = self.client.patch(f'/api/confessions/{confession.id}/', {
            'title': 'Updated Draft',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_author_cannot_edit_submitted(self):
        member = self._create_and_login('m@test.com', self.member_role)
        confession = Confession.objects.create(
            title='Submitted', content='c', author=member,
            organization=self.org, status='submitted',
        )
        response = self.client.patch(f'/api/confessions/{confession.id}/', {
            'title': 'Nope',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_confession_hides_author(self):
        member = self._create_and_login('m@test.com', self.member_role)
        confession = Confession.objects.create(
            title='Anon', content='c', author=member,
            organization=self.org, is_anonymous=True,
        )
        # Author can see themselves
        response = self.client.get(f'/api/confessions/{confession.id}/')
        self.assertIsNotNone(response.data['author'])

    def test_anonymous_hidden_from_other_member(self):
        member1 = CustomUser.objects.create_user(
            email='m1@test.com', password='TestPass123!@#',
            first_name='M1', last_name='U', role=self.member_role,
        )
        Confession.objects.create(
            title='Anon', content='c', author=member1,
            organization=self.org, is_anonymous=True,
        )
        # Admin can see author of anon confession
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/confessions/')
        self.assertIsNotNone(response.data['results'][0]['author'])


class ConfessionTransitionTest(ConfessionTestBase):
    def setUp(self):
        super().setUp()
        self.org = Organization.objects.create(name='Test Org')

    def test_author_can_submit_draft(self):
        member = self._create_and_login('m@test.com', self.member_role)
        confession = Confession.objects.create(
            title='Draft', content='c', author=member,
            organization=self.org, status='draft',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/submit/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        confession.refresh_from_db()
        self.assertEqual(confession.status, 'submitted')

    def test_non_author_cannot_submit(self):
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='Draft', content='c', author=member,
            organization=self.org, status='draft',
        )
        self._create_and_login('other@test.com', self.member_role)
        response = self.client.post(f'/api/confessions/{confession.id}/submit/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_can_review_submitted(self):
        leader = self._create_and_login('cl@test.com', self.leader_role)
        self.org.leader = leader
        self.org.save()
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='Sub', content='c', author=member,
            organization=self.org, status='submitted',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/review/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        confession.refresh_from_db()
        self.assertEqual(confession.status, 'under_review')

    def test_leader_can_approve(self):
        leader = self._create_and_login('cl@test.com', self.leader_role)
        self.org.leader = leader
        self.org.save()
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='Review', content='c', author=member,
            organization=self.org, status='under_review',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        confession.refresh_from_db()
        self.assertEqual(confession.status, 'approved')

    def test_leader_can_reject(self):
        leader = self._create_and_login('cl@test.com', self.leader_role)
        self.org.leader = leader
        self.org.save()
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='Review', content='c', author=member,
            organization=self.org, status='under_review',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/reject/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        confession.refresh_from_db()
        self.assertEqual(confession.status, 'rejected')

    def test_cannot_approve_draft(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='Draft', content='c', author=member,
            organization=self.org, status='draft',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_cannot_review(self):
        self._create_and_login('m@test.com', self.member_role)
        member2 = CustomUser.objects.create_user(
            email='m2@test.com', password='TestPass123!@#',
            first_name='M2', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='Sub', content='c', author=member2,
            organization=self.org, status='submitted',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/review/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='C', content='c', author=member,
            organization=self.org, status='draft',
        )
        response = self.client.post(f'/api/confessions/{confession.id}/invalid/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DashboardStatsTest(ConfessionTestBase):
    def test_authenticated_gets_stats(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.get('/api/confessions/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('confessions', response.data)
        self.assertIn('documents', response.data)
        self.assertIn('notifications', response.data)

    def test_unauthenticated_denied(self):
        self.client.credentials()
        response = self.client.get('/api/confessions/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
