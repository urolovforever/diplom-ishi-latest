import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = 'https://api.telegram.org/bot{token}'


class TelegramBot:

    def __init__(self, token=None):
        self.token = token or settings.TELEGRAM_BOT_TOKEN
        self.base_url = TELEGRAM_API_BASE.format(token=self.token)

    def send_message(self, chat_id, text, parse_mode='HTML'):
        """Send a message to a Telegram chat."""
        if not self.token:
            logger.warning('Telegram bot token not configured. Skipping.')
            return None

        url = f'{self.base_url}/sendMessage'
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode,
        }
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error('Failed to send Telegram message: %s', e)
            return None

    def send_alert(self, chat_id, title, message, severity='info'):
        """Send a formatted alert message."""
        emoji_map = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'high': '🔴',
            'critical': '🚨',
        }
        emoji = emoji_map.get(severity, 'ℹ️')
        text = f'{emoji} <b>{title}</b>\n\n{message}'
        return self.send_message(chat_id, text)

    def send_anomaly_alert(self, chat_id, user_email, score, features, severity='high'):
        """Send an anomaly detection alert."""
        text = (
            f'🚨 <b>Anomaly Detected</b>\n\n'
            f'<b>User:</b> {user_email}\n'
            f'<b>Score:</b> {score:.4f}\n'
            f'<b>Severity:</b> {severity}\n\n'
            f'<b>Features:</b>\n'
        )
        for key, val in features.items():
            text += f'  • {key}: {val}\n'
        return self.send_message(chat_id, text)
