from rest_framework.permissions import BasePermission
from accounts.models import Role

SECURITY_LEVEL_HIERARCHY = {
    'public': 0,
    'internal': 1,
    'confidential': 2,
    'secret': 3,
}

ROLE_MAX_SECURITY_LEVEL = {
    Role.SUPER_ADMIN: 'secret',
    Role.QOMITA_RAHBAR: 'secret',
    Role.QOMITA_XODIMI: 'secret',
    Role.KONFESSIYA_RAHBARI: 'confidential',
    Role.KONFESSIYA_XODIMI: 'confidential',
    Role.ADLIYA_XODIMI: 'confidential',
    Role.KENGASH_AZO: 'internal',
}


def filter_by_security_level(qs, user):
    if not user.role:
        return qs.filter(security_level='public')
    max_level = ROLE_MAX_SECURITY_LEVEL.get(user.role.name, 'public')
    max_num = SECURITY_LEVEL_HIERARCHY.get(max_level, 0)
    allowed = [k for k, v in SECURITY_LEVEL_HIERARCHY.items() if v <= max_num]
    return qs.filter(security_level__in=allowed)


def requires_download_confirmation(document, user):
    """Return True if document requires extra confirmation before download."""
    if document.security_level in ('confidential', 'secret'):
        return True
    return False


class CanAccessDocument(BasePermission):
    """Check if user's role allows access to this document's security level."""

    def has_object_permission(self, request, view, obj):
        if not request.user.role:
            return obj.security_level == 'public'
        max_level = ROLE_MAX_SECURITY_LEVEL.get(request.user.role.name, 'public')
        max_num = SECURITY_LEVEL_HIERARCHY.get(max_level, 0)
        doc_num = SECURITY_LEVEL_HIERARCHY.get(obj.security_level, 0)
        return doc_num <= max_num
