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


class IsConfessionLeader(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role
            and request.user.role.name in [
                Role.SUPER_ADMIN,
                Role.QOMITA_RAHBAR,
                Role.CONFESSION_LEADER,
            ]
        )
