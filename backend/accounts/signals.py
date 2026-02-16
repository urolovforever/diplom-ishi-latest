from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser
from .authentication import generate_totp_secret


@receiver(post_save, sender=CustomUser)
def assign_totp_secret(sender, instance, created, **kwargs):
    """Auto-generate TOTP secret for new users."""
    if created and not instance.totp_secret:
        instance.totp_secret = generate_totp_secret()
        instance.save(update_fields=['totp_secret'])
