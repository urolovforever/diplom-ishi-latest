from rest_framework.permissions import BasePermission
from .models import Role


# Role creation hierarchy map
ROLE_CREATION_MAP = {
    Role.SUPER_ADMIN: [
        Role.QOMITA_RAHBAR, Role.QOMITA_XODIMI,
        Role.KONFESSIYA_RAHBARI, Role.KONFESSIYA_XODIMI,
        Role.DT_RAHBAR, Role.DT_XODIMI,
    ],
    Role.QOMITA_RAHBAR: [
        Role.QOMITA_XODIMI,
        Role.KONFESSIYA_RAHBARI, Role.KONFESSIYA_XODIMI,
        Role.DT_XODIMI,
    ],
    Role.KONFESSIYA_RAHBARI: [
        Role.KONFESSIYA_XODIMI,
        Role.DT_RAHBAR,
        Role.DT_XODIMI,
    ],
    Role.DT_RAHBAR: [
        Role.DT_XODIMI,
    ],
}

# Rolga mos tashkilot turi
ROLE_ORG_TYPE_MAP = {
    Role.QOMITA_RAHBAR: 'qomita',
    Role.QOMITA_XODIMI: 'qomita',
    Role.KONFESSIYA_RAHBARI: 'konfessiya',
    Role.KONFESSIYA_XODIMI: 'konfessiya',
    Role.DT_RAHBAR: 'diniy_tashkilot',
    Role.DT_XODIMI: 'diniy_tashkilot',
}

# Roles that can manage users
LEADER_ROLES = [
    Role.SUPER_ADMIN,
    Role.QOMITA_RAHBAR,
    Role.KONFESSIYA_RAHBARI,
    Role.DT_RAHBAR,
]


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name == Role.SUPER_ADMIN
        )


class IsQomitaRahbar(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]
        )


class IsQomitaXodimi(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.QOMITA_XODIMI,
            ]
        )


class IsKonfessiyaRahbari(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.KONFESSIYA_RAHBARI,
            ]
        )


class IsKonfessiyaXodimi(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.KONFESSIYA_RAHBARI,
                Role.KONFESSIYA_XODIMI,
            ]
        )


class IsDTRahbar(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.KONFESSIYA_RAHBARI,
                Role.DT_RAHBAR,
            ]
        )


class IsDTXodimi(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.KONFESSIYA_RAHBARI,
                Role.DT_RAHBAR,
                Role.DT_XODIMI,
            ]
        )


class IsLeader(BasePermission):
    """Permission for any leader role (can manage users)."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in LEADER_ROLES
        )


class HasRole(BasePermission):
    """Flexible permission that checks if user has one of the specified roles."""

    def __init__(self, allowed_roles=None):
        self.allowed_roles = allowed_roles or []

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not request.user.role:
            return False
        return request.user.role.name in self.allowed_roles


def has_role(*roles):
    """Factory function to create a HasRole permission with specific roles."""
    class _HasRole(BasePermission):
        def has_permission(self, request, view):
            if not request.user.is_authenticated or not request.user.role:
                return False
            return request.user.role.name in roles
    _HasRole.__name__ = f'HasRole_{"_".join(roles)}'
    return _HasRole
