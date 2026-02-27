from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Use SMTP backend with MailHog in development
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'mailhog')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 1025))
EMAIL_USE_TLS = False
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
