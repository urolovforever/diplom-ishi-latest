import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Organization(models.Model):
    ORG_TYPE_CHOICES = [
        ('qomita', "Qo'mita"),
        ('konfessiya', 'Konfessiya'),
        ('diniy_tashkilot', 'Diniy Tashkilot'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    org_type = models.CharField(max_length=20, choices=ORG_TYPE_CHOICES, default='qomita')
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True, related_name='children',
    )
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='led_organizations',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.org_type == 'qomita' and self.parent is not None:
            raise ValidationError("Qo'mita parent'ga ega bo'la olmaydi.")
        if self.org_type == 'konfessiya':
            if self.parent is None or self.parent.org_type != 'qomita':
                raise ValidationError("Konfessiya faqat Qo'mitaga tegishli bo'lishi kerak.")
        if self.org_type == 'diniy_tashkilot':
            if self.parent is None or self.parent.org_type != 'konfessiya':
                raise ValidationError("Diniy tashkilot faqat Konfessiyaga tegishli bo'lishi kerak.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['org_type', 'name']

    def __str__(self):
        return self.name
