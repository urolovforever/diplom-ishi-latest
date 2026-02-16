import os
import base64

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from django.conf import settings


def get_encryption_key():
    """Derive AES-256 key from Django SECRET_KEY."""
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'scp-document-encryption',
        iterations=100_000,
    )
    key = kdf.derive(settings.SECRET_KEY.encode())
    return key


def encrypt_file(file_content):
    """Encrypt file content using AES-256-CBC. Returns (iv + ciphertext)."""
    key = get_encryption_key()
    iv = os.urandom(16)

    padder = padding.PKCS7(128).padder()
    padded = padder.update(file_content) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    return iv + ciphertext


def decrypt_file(encrypted_content):
    """Decrypt AES-256-CBC encrypted file. Input = iv (16 bytes) + ciphertext."""
    key = get_encryption_key()
    iv = encrypted_content[:16]
    ciphertext = encrypted_content[16:]

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded) + unpadder.finalize()

    return plaintext
