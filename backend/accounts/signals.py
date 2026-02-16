import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .authentication import generate_totp_secret
from .models import CustomUser

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CustomUser)
def assign_totp_secret(sender, instance, created, **kwargs):
    """Auto-generate TOTP secret for new users."""
    if created and not instance.totp_secret:
        instance.totp_secret = generate_totp_secret()
        instance.save(update_fields=['totp_secret'])


@receiver(post_save, sender=CustomUser)
def send_welcome_email_on_creation(sender, instance, created, **kwargs):
    """Send welcome email when a new user is created."""
    if created:
        try:
            from notifications.tasks import send_welcome_email
            send_welcome_email.delay(instance.email, instance.first_name)
        except Exception as e:
            logger.warning(f'Failed to queue welcome email for {instance.email}: {e}')
