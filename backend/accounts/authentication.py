import pyotp


def generate_totp_secret():
    """Generate a new TOTP secret key."""
    return pyotp.random_base32()


def get_totp_uri(secret, email, issuer='SecureConfession'):
    """Generate a TOTP provisioning URI for QR codes."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret, token):
    """Verify a TOTP token against the secret."""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)
