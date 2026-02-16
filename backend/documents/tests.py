from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Organization, Confession
from documents.models import Document, DocumentVersion


class DocumentTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name=Role.SUPER_ADMIN)
        self.qomita_role = Role.objects.create(name=Role.QOMITA_RAHBAR)
        self.leader_role = Role.objects.create(name=Role.CONFESSION_LEADER)
        self.member_role = Role.objects.create(name=Role.MEMBER)
        self.org = Organization.objects.create(name='Test Org')

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

    def _make_file(self, name='test.txt', content=b'test content'):
        return SimpleUploadedFile(name, content, content_type='text/plain')


class DocumentUploadTest(DocumentTestBase):
    def test_member_can_upload_document(self):
        self._create_and_login('m@test.com', self.member_role)
        response = self.client.post('/api/documents/', {
            'title': 'Test Doc',
            'file': self._make_file(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Doc')

    def test_upload_creates_initial_version(self):
        user = self._create_and_login('m@test.com', self.member_role)
        self.client.post('/api/documents/', {
            'title': 'Versioned Doc',
            'file': self._make_file(),
        }, format='multipart')
        doc = Document.objects.get(title='Versioned Doc')
        versions = doc.versions.all()
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().version_number, 1)
        self.assertEqual(versions.first().change_summary, 'Initial version')

    def test_unauthenticated_cannot_upload(self):
        response = self.client.post('/api/documents/', {
            'title': 'Nope',
            'file': self._make_file(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DocumentVisibilityTest(DocumentTestBase):
    def test_member_sees_only_own_documents(self):
        member1 = self._create_and_login('m1@test.com', self.member_role)
        Document.objects.create(
            title='Mine', file='test.txt', uploaded_by=member1,
        )
        member2 = CustomUser.objects.create_user(
            email='m2@test.com', password='TestPass123!@#',
            first_name='M2', last_name='U', role=self.member_role,
        )
        Document.objects.create(
            title='Theirs', file='test2.txt', uploaded_by=member2,
        )
        response = self.client.get('/api/documents/')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Mine')

    def test_admin_sees_all_documents(self):
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        Document.objects.create(title='D1', file='t1.txt', uploaded_by=member)
        Document.objects.create(title='D2', file='t2.txt', uploaded_by=member)
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/documents/')
        self.assertEqual(len(response.data['results']), 2)

    def test_leader_sees_org_documents(self):
        leader = self._create_and_login('cl@test.com', self.leader_role)
        self.org.leader = leader
        self.org.save()
        member = CustomUser.objects.create_user(
            email='m@test.com', password='TestPass123!@#',
            first_name='M', last_name='U', role=self.member_role,
        )
        confession = Confession.objects.create(
            title='C', content='c', author=member, organization=self.org,
        )
        Document.objects.create(
            title='Org Doc', file='t.txt', uploaded_by=member, confession=confession,
        )
        other_org = Organization.objects.create(name='Other')
        other_confession = Confession.objects.create(
            title='C2', content='c', author=member, organization=other_org,
        )
        Document.objects.create(
            title='Other Doc', file='t2.txt', uploaded_by=member, confession=other_confession,
        )
        response = self.client.get('/api/documents/')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Org Doc')


class DocumentVersionTest(DocumentTestBase):
    def test_list_versions(self):
        user = self._create_and_login('m@test.com', self.member_role)
        doc = Document.objects.create(
            title='Doc', file='test.txt', uploaded_by=user,
        )
        DocumentVersion.objects.create(
            document=doc, version_number=1, file='v1.txt',
            created_by=user, change_summary='v1',
        )
        response = self.client.get(f'/api/documents/{doc.id}/versions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_new_version(self):
        user = self._create_and_login('m@test.com', self.member_role)
        doc = Document.objects.create(
            title='Doc', file='test.txt', uploaded_by=user,
        )
        DocumentVersion.objects.create(
            document=doc, version_number=1, file='v1.txt',
            created_by=user, change_summary='v1',
        )
        response = self.client.post(f'/api/documents/{doc.id}/versions/', {
            'file': self._make_file('v2.txt'),
            'change_summary': 'Updated version',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['version_number'], 2)
