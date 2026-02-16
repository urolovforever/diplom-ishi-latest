import re
from django.core.exceptions import ValidationError


def validate_password_strength(password):
    """Validate password meets strength requirements: 12+ chars, mixed case, digits, special."""
    errors = []

    if len(password) < 12:
        errors.append('Password must be at least 12 characters long.')
    if not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter.')
    if not re.search(r'[a-z]', password):
        errors.append('Password must contain at least one lowercase letter.')
    if not re.search(r'\d', password):
        errors.append('Password must contain at least one digit.')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append('Password must contain at least one special character.')

    if errors:
        raise ValidationError(errors)
