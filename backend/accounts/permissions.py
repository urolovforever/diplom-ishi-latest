from rest_framework.permissions import BasePermission
from .models import Role


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


class IsAdliyaXodimi(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.ADLIYA_XODIMI,
            ]
        )


class IsKengashAzo(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.KENGASH_AZO,
            ]
        )


# Backward-compatible aliases for views that used old permission names
IsConfessionLeader = IsKonfessiyaRahbari
IsSecurityAuditor = IsQomitaRahbar
IsPsychologist = IsKonfessiyaXodimi
IsITAdmin = IsQomitaXodimi


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
