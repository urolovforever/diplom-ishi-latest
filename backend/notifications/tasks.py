import logging
from datetime import datetime

import resend
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _send_email(to, subject, html, text):
    """Send email via Resend API."""
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
        'from': settings.DEFAULT_FROM_EMAIL,
        'to': [to],
        'subject': subject,
        'html': html,
        'text': text,
    })


@shared_task
def send_notification_email(recipient_email, subject, message):
    """Send a generic notification email."""
    try:
        html_content = render_to_string('emails/notification.html', {
            'subject': subject,
            'message': message,
            'year': datetime.now().year,
        })
        _send_email(recipient_email, subject, html_content, message)
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
            'year': datetime.now().year,
        })
        _send_email(
            recipient_email,
            'Emanat Systems — Parolni tiklash',
            html_content,
            f'Parolni tiklash: {reset_url}',
        )
        logger.info(f'Password reset email sent to {recipient_email}')
    except Exception as e:
        logger.error(f'Failed to send password reset email to {recipient_email}: {e}')
        raise


@shared_task
def send_welcome_email(recipient_email, first_name, token):
    """Send a welcome email with a set-password link to a newly created user."""
    try:
        set_password_url = f'{settings.FRONTEND_URL}/password-reset/confirm?token={token}'
        html_content = render_to_string('emails/welcome.html', {
            'first_name': first_name,
            'set_password_url': set_password_url,
            'year': datetime.now().year,
        })
        _send_email(
            recipient_email,
            'Emanat Systems — Xush kelibsiz!',
            html_content,
            f'{first_name}, parolingizni o\'rnating: {set_password_url}',
        )
        logger.info(f'Welcome email sent to {recipient_email}')
    except Exception as e:
        logger.error(f'Failed to send welcome email to {recipient_email}: {e}')
        raise


@shared_task
def send_session_termination_code(recipient_email, code):
    """Send a 6-digit verification code for session termination."""
    try:
        html_content = render_to_string('emails/notification.html', {
            'subject': 'Sessiyani tugatish kodi',
            'message': f'Sessiyani tugatish uchun tasdiqlash kodingiz: <strong style="font-size: 24px; letter-spacing: 4px;">{code}</strong><br><br>Bu kod 10 daqiqa davomida amal qiladi.',
            'year': datetime.now().year,
        })
        _send_email(
            recipient_email,
            f'Emanat Systems — Tasdiqlash kodi: {code}',
            html_content,
            f'Sessiyani tugatish kodi: {code}. Bu kod 10 daqiqa davomida amal qiladi.',
        )
        logger.info(f'Session termination code sent to {recipient_email}')
    except Exception as e:
        logger.error(f'Failed to send session termination code to {recipient_email}: {e}')
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
