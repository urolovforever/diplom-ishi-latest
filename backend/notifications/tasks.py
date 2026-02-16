import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task
def send_notification_email(recipient_email, subject, message):
    """Send a generic notification email."""
    try:
        html_content = render_to_string('emails/notification.html', {
            'subject': subject,
            'message': message,
        })
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_content,
        )
        logger.info(f'Notification email sent to {recipient_email}')
    except Exception as e:
        logger.error(f'Failed to send notification email to {recipient_email}: {e}')
        raise


@shared_task
def send_password_reset_email(recipient_email, reset_token):
    """Send a password reset email with a link."""
    try:
        reset_url = f'{settings.FRONTEND_URL}/password-reset/confirm?token={reset_token}'
        html_content = render_to_string('emails/password_reset.html', {
            'reset_url': reset_url,
        })
        send_mail(
            subject='Password Reset Request',
            message=f'Reset your password: {reset_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_content,
        )
        logger.info(f'Password reset email sent to {recipient_email}')
    except Exception as e:
        logger.error(f'Failed to send password reset email to {recipient_email}: {e}')
        raise


@shared_task
def send_welcome_email(recipient_email, first_name):
    """Send a welcome email to a newly created user."""
    try:
        login_url = f'{settings.FRONTEND_URL}/login'
        html_content = render_to_string('emails/welcome.html', {
            'first_name': first_name,
            'login_url': login_url,
        })
        send_mail(
            subject='Welcome to Secure Confession Platform',
            message=f'Welcome {first_name}! Log in at {login_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_content,
        )
        logger.info(f'Welcome email sent to {recipient_email}')
    except Exception as e:
        logger.error(f'Failed to send welcome email to {recipient_email}: {e}')
        raise


@shared_task
def send_telegram_alert(message, chat_id=None):
    """Send an alert message via Telegram."""
    try:
        from .telegram import TelegramBot
        bot = TelegramBot()
        target_chat_id = chat_id or settings.TELEGRAM_DEFAULT_CHAT_ID
        if not target_chat_id:
            logger.warning('No Telegram chat_id configured. Skipping.')
            return
        bot.send_message(target_chat_id, message)
        logger.info('Telegram alert sent to %s', target_chat_id)
    except Exception as e:
        logger.error('Failed to send Telegram alert: %s', e)


@shared_task
def check_alert_thresholds():
    """Check all active alert rules and dispatch alerts. Runs every 5 minutes."""
    try:
        from .alerting import AlertEngine
        engine = AlertEngine()
        engine.check_thresholds()
    except Exception as e:
        logger.error('Failed to check alert thresholds: %s', e)
