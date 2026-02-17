import uuid
from django.db import models
from django.conf import settings


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='led_organizations',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Confession(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    # TZ: Confession types
    TYPE_CHOICES = [
        ('diniy', 'Diniy'),
        ('fuqarolik', 'Fuqarolik'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='confessions',
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='confessions',
    )
    # TZ required fields
    confession_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='diniy')
    registration_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    legal_address = models.TextField(blank=True)
    organization_count = models.IntegerField(default=0)
    member_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_anonymous = models.BooleanField(default=False)
    is_e2e_encrypted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ConfessionEncryptedKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    confession = models.ForeignKey(
        Confession, on_delete=models.CASCADE, related_name='encrypted_keys',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='confession_encrypted_keys',
    )
    encrypted_key = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['confession', 'user']

    def __str__(self):
        return f'EncKey: {self.confession.title} -> {self.user.email}'
