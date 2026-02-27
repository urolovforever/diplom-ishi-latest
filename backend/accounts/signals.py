import logging
import uuid
from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .authentication import generate_totp_secret
from .models import CustomUser, PasswordResetToken

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CustomUser)
def assign_totp_secret(sender, instance, created, **kwargs):
    """Auto-generate TOTP secret for new users."""
    if created and not instance.totp_secret:
        instance.totp_secret = generate_totp_secret()
        instance.save(update_fields=['totp_secret'])


@receiver(post_save, sender=CustomUser)
def send_welcome_email_on_creation(sender, instance, created, **kwargs):
    """Send welcome email with set-password link when a new user is created."""
    if created:
        try:
            token_str = uuid.uuid4().hex
            PasswordResetToken.objects.create(
                user=instance,
                token=token_str,
                expires_at=timezone.now() + timedelta(hours=72),
            )
            from notifications.tasks import send_welcome_email
            send_welcome_email.delay(instance.email, instance.first_name, token_str)
        except Exception as e:
            logger.warning(f'Failed to queue welcome email for {instance.email}: {e}')
