import os
import re

from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png'}
ALLOWED_CONTENT_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# Suspicious patterns for basic malware scanning
SUSPICIOUS_PATTERNS = [
    b'<script',
    b'javascript:',
    b'<?php',
    b'eval(',
    b'exec(',
    b'os.system',
    b'subprocess.',
    b'__import__',
]


def validate_file_type(file):
    """Validate file extension and content type."""
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f'File type "{ext}" is not allowed. '
            f'Allowed types: {", ".join(sorted(ALLOWED_EXTENSIONS))}'
        )

    if hasattr(file, 'content_type') and file.content_type:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            # Also accept generic octet-stream (some clients send this)
            if file.content_type != 'application/octet-stream':
                raise ValidationError(
                    f'Content type "{file.content_type}" is not allowed.'
                )


def validate_file_size(file):
    """Validate file does not exceed max size."""
    if file.size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        file_mb = file.size / (1024 * 1024)
        raise ValidationError(
            f'File size ({file_mb:.1f} MB) exceeds the maximum allowed size ({max_mb:.0f} MB).'
        )


def scan_file_content(file):
    """Basic scan for suspicious content patterns (malware heuristics)."""
    file.seek(0)
    # Read first 1MB for scanning
    content = file.read(1024 * 1024)
    file.seek(0)

    content_lower = content.lower()
    for pattern in SUSPICIOUS_PATTERNS:
        if pattern.lower() in content_lower:
            raise ValidationError(
                'File contains suspicious content and has been rejected.'
            )


def validate_document_file(file):
    """Run all file validations."""
    validate_file_type(file)
    validate_file_size(file)
    scan_file_content(file)
