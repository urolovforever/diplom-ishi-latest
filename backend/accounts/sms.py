"""
SMS 2FA verification module.
Supports sending OTP codes via SMS as an alternative to TOTP.
Uses a pluggable backend (console for dev, Twilio/Eskiz for production).
"""
import logging
import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

SMS_CODE_LENGTH = 6
SMS_CODE_EXPIRY_MINUTES = 5
SMS_CODE_CACHE_PREFIX = 'sms_2fa_'


def generate_sms_code():
    """Generate a random numeric OTP code."""
    return ''.join(random.choices(string.digits, k=SMS_CODE_LENGTH))


def send_sms_code(phone_number, code):
    """
    Send SMS verification code.
    Uses console backend in development, can be replaced with Twilio/Eskiz in production.
    """
    sms_backend = getattr(settings, 'SMS_BACKEND', 'console')

    if sms_backend == 'console':
        logger.info('SMS 2FA code for %s: %s', phone_number, code)
        return True

    if sms_backend == 'twilio':
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=f'Your verification code: {code}',
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone_number,
            )
            return True
        except Exception as e:
            logger.error('Failed to send SMS via Twilio: %s', e)
            return False

    logger.warning('Unknown SMS backend: %s', sms_backend)
    return False


def create_and_send_sms_code(user):
    """Generate, cache, and send an SMS verification code for a user."""
    if not user.phone_number:
        logger.warning('No phone number for user %s', user.email)
        return False

    code = generate_sms_code()
    cache_key = f'{SMS_CODE_CACHE_PREFIX}{user.id}'
    cache.set(cache_key, code, timeout=SMS_CODE_EXPIRY_MINUTES * 60)

    return send_sms_code(user.phone_number, code)


def verify_sms_code(user, code):
    """Verify an SMS OTP code for a user."""
    cache_key = f'{SMS_CODE_CACHE_PREFIX}{user.id}'
    stored_code = cache.get(cache_key)

    if stored_code and stored_code == code:
        cache.delete(cache_key)
        return True

    return False
