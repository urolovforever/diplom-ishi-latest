import uuid
from django.db import models
from django.conf import settings


class Document(models.Model):
    SECURITY_LEVELS = [
        ('public', 'Public'),
        ('internal', 'Internal'),
        ('confidential', 'Confidential'),
        ('secret', 'Secret'),
    ]

    CATEGORIES = [
        ('confession_doc', 'Confession Document'),
        ('evidence', 'Evidence'),
        ('report', 'Report'),
        ('legal', 'Legal'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='documents/%Y/%m/')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents',
    )
    confession = models.ForeignKey(
        'confessions.Confession', on_delete=models.CASCADE,
        related_name='documents', null=True, blank=True,
    )
    is_encrypted = models.BooleanField(default=True)
    security_level = models.CharField(max_length=20, choices=SECURITY_LEVELS, default='internal')
    category = models.CharField(max_length=20, choices=CATEGORIES, default='other')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class DocumentVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to='document_versions/%Y/%m/')
    change_summary = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='document_versions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ['document', 'version_number']

    def __str__(self):
        return f'{self.document.title} v{self.version_number}'


class DocumentEncryptedKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name='encrypted_keys',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='document_encrypted_keys',
    )
    encrypted_key = models.TextField()  # Base64 encoded RSA-encrypted symmetric key
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['document', 'user']

    def __str__(self):
        return f'EncKey: {self.document.title} -> {self.user.email}'


class DocumentAccessLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='access_logs')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='document_access_logs',
    )
    action = models.CharField(max_length=50)  # view, download, edit
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} - {self.action} - {self.document.title}'


class HoneypotFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file_path = models.CharField(max_length=500)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='honeypot_files',
    )
    is_active = models.BooleanField(default=True)
    access_count = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='honeypot_accesses',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'[HONEYPOT] {self.title}'
