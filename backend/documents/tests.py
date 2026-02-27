from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import CustomUser, Role
from confessions.models import Confession, Organization
from documents.models import Document, DocumentVersion, DocumentAccessLog, HoneypotFile


class DocumentTestBase(APITestCase):
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

    def _make_file(self, name='test.pdf', content=b'%PDF-1.4 test content'):
        return SimpleUploadedFile(name, content, content_type='application/pdf')


class DocumentUploadTest(DocumentTestBase):
    def test_dt_xodimi_can_upload_document(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/documents/', {
            'title': 'Test Doc',
            'file': self._make_file(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Doc')

    def test_upload_creates_initial_version(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
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

    def test_upload_with_security_level(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/documents/', {
            'title': 'Classified Doc',
            'file': self._make_file(),
            'security_level': 'confidential',
            'category': 'confidential',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['security_level'], 'confidential')
        self.assertEqual(response.data['category'], 'confidential')


class DocumentVisibilityTest(DocumentTestBase):
    def test_dt_xodimi_sees_only_own_documents(self):
        user1 = self._create_and_login(
            'm1@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        Document.objects.create(
            title='Mine', file='test.txt', uploaded_by=user1,
        )
        user2 = CustomUser.objects.create_user(
            email='m2@test.com', password='TestPass123!@#',
            first_name='M2', last_name='U', role=self.dt_xodimi_role,
            organization=self.org,
        )
        Document.objects.create(
            title='Theirs', file='test2.txt', uploaded_by=user2,
        )
        response = self.client.get('/api/documents/')
        # User1 should see own document, plus possibly shared org docs
        titles = [d['title'] for d in response.data['results']]
        self.assertIn('Mine', titles)

    def test_admin_sees_all_documents(self):
        dt_xodimi = CustomUser.objects.create_user(
            email='dx@test.com', password='TestPass123!@#',
            first_name='DX', last_name='U', role=self.dt_xodimi_role,
            organization=self.org,
        )
        Document.objects.create(title='D1', file='t1.txt', uploaded_by=dt_xodimi)
        Document.objects.create(title='D2', file='t2.txt', uploaded_by=dt_xodimi)
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/documents/')
        self.assertEqual(len(response.data['results']), 2)

    def test_security_level_filtering(self):
        user = self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        Document.objects.create(
            title='Public', file='t1.txt', uploaded_by=user, security_level='public',
        )
        Document.objects.create(
            title='Internal', file='t2.txt', uploaded_by=user, security_level='internal',
        )
        Document.objects.create(
            title='Secret', file='t3.txt', uploaded_by=user, security_level='secret',
        )
        response = self.client.get('/api/documents/')
        # DT xodimi should only see public and internal (max level = internal)
        titles = [d['title'] for d in response.data['results']]
        self.assertIn('Public', titles)
        self.assertIn('Internal', titles)
        self.assertNotIn('Secret', titles)


class DocumentE2EEncryptionTest(DocumentTestBase):
    def test_create_e2e_encrypted_document(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/documents/', {
            'title': 'E2E Doc',
            'file': self._make_file(),
            'is_e2e_encrypted': True,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_e2e_encrypted'])

    def test_e2e_document_returns_encrypted_keys(self):
        user = self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        from documents.models import DocumentEncryptedKey
        doc = Document.objects.create(
            title='E2E Doc', file='test.txt', uploaded_by=user,
            is_e2e_encrypted=True,
        )
        DocumentEncryptedKey.objects.create(
            document=doc, user=user, encrypted_key='dockey123',
        )
        response = self.client.get(f'/api/documents/{doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_e2e_encrypted'])
        self.assertEqual(len(response.data['encrypted_keys']), 1)
        self.assertEqual(response.data['encrypted_keys'][0]['encrypted_key'], 'dockey123')

    def test_is_e2e_encrypted_default_false(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/documents/', {
            'title': 'Normal Doc',
            'file': self._make_file(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_e2e_encrypted'])

    def test_non_e2e_document_has_empty_keys(self):
        user = self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        doc = Document.objects.create(
            title='Normal Doc', file='test.txt', uploaded_by=user,
        )
        response = self.client.get(f'/api/documents/{doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_e2e_encrypted'])
        self.assertEqual(len(response.data['encrypted_keys']), 0)


class DocumentVersionTest(DocumentTestBase):
    def test_list_versions(self):
        user = self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
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
        user = self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        doc = Document.objects.create(
            title='Doc', file='test.txt', uploaded_by=user,
        )
        DocumentVersion.objects.create(
            document=doc, version_number=1, file='v1.txt',
            created_by=user, change_summary='v1',
        )
        response = self.client.post(f'/api/documents/{doc.id}/versions/', {
            'file': self._make_file('v2.pdf'),
            'change_summary': 'Updated version',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['version_number'], 2)


class DocumentAccessLogTest(DocumentTestBase):
    def test_viewing_document_creates_access_log(self):
        user = self._create_and_login('sa@test.com', self.super_admin_role)
        doc = Document.objects.create(
            title='Doc', file='test.txt', uploaded_by=user,
        )
        self.client.get(f'/api/documents/{doc.id}/')
        self.assertEqual(DocumentAccessLog.objects.count(), 1)
        log = DocumentAccessLog.objects.first()
        self.assertEqual(log.action, 'view')

    def test_admin_can_list_access_logs(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.get('/api/documents/access-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dt_xodimi_cannot_list_access_logs(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.get('/api/documents/access-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HoneypotTest(DocumentTestBase):
    def test_admin_can_create_honeypot(self):
        self._create_and_login('sa@test.com', self.super_admin_role)
        response = self.client.post('/api/documents/honeypot/', {
            'title': 'Trap',
            'file_path': '/bait/file.txt',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dt_xodimi_cannot_create_honeypot(self):
        self._create_and_login(
            'dx@test.com', self.dt_xodimi_role,
            organization=self.org,
        )
        response = self.client.post('/api/documents/honeypot/', {
            'title': 'Nope',
            'file_path': '/bait.txt',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_honeypot_access_creates_alert(self):
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        honeypot = HoneypotFile.objects.create(
            title='Trap', file_path='/bait.txt', created_by=admin,
        )
        response = self.client.get(f'/api/documents/honeypot/{honeypot.id}/access/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        honeypot.refresh_from_db()
        self.assertEqual(honeypot.access_count, 1)

    def test_honeypot_access_creates_anomaly_report(self):
        from ai_security.models import AnomalyReport
        admin = self._create_and_login('sa@test.com', self.super_admin_role)
        honeypot = HoneypotFile.objects.create(
            title='Trap', file_path='/bait.txt', created_by=admin,
        )
        self.client.get(f'/api/documents/honeypot/{honeypot.id}/access/')
        self.assertTrue(AnomalyReport.objects.filter(title__contains='Honeypot').exists())
