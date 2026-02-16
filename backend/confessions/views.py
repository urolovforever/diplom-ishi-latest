from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from accounts.permissions import IsQomitaRahbar
from audit.mixins import AuditMixin
from .models import Organization, Confession
from .serializers import (
    OrganizationListSerializer,
    OrganizationWriteSerializer,
    ConfessionListSerializer,
    ConfessionWriteSerializer,
)


class OrganizationListCreateView(AuditMixin, generics.ListCreateAPIView):
    permission_classes = [IsQomitaRahbar]

    def get_queryset(self):
        return Organization.objects.select_related('leader__role').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrganizationWriteSerializer
        return OrganizationListSerializer


class OrganizationDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsQomitaRahbar]
    lookup_field = 'pk'

    def get_queryset(self):
        return Organization.objects.select_related('leader__role').all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return OrganizationWriteSerializer
        return OrganizationListSerializer


class ConfessionListCreateView(AuditMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'organization', 'is_anonymous']
    filterset_class = None  # Uses filterset_fields; see confessions/filters.py for advanced filtering

    def get_queryset(self):
        user = self.request.user
        qs = Confession.objects.select_related('author__role', 'organization').all()
        if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]:
            return qs
        if user.role and user.role.name == Role.PSYCHOLOGIST:
            return qs  # Read-only access to all confessions
        if user.role and user.role.name == Role.CONFESSION_LEADER:
            # Leaders see confessions in orgs they lead + their own
            return qs.filter(Q(organization__leader=user) | Q(author=user))
        # Members see only their own
        return qs.filter(author=user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ConfessionWriteSerializer
        return ConfessionListSerializer

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        self._create_audit_log('create', instance)
        return instance


class ConfessionDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        user = self.request.user
        qs = Confession.objects.select_related('author__role', 'organization').all()
        if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]:
            return qs
        if user.role and user.role.name == Role.PSYCHOLOGIST:
            return qs  # Read-only access
        if user.role and user.role.name == Role.CONFESSION_LEADER:
            return qs.filter(Q(organization__leader=user) | Q(author=user))
        return qs.filter(author=user)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ConfessionWriteSerializer
        return ConfessionListSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Edit restrictions: authors edit own drafts; leaders+ edit any
        if request.method in ('PUT', 'PATCH', 'DELETE'):
            user = request.user
            if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]:
                return
            if user.role and user.role.name == Role.CONFESSION_LEADER and obj.organization.leader == user:
                return
            if obj.author == user and obj.status == 'draft':
                return
            self.permission_denied(request, message='You cannot edit this confession.')


TRANSITIONS = {
    'submit': {'from': ['draft'], 'to': 'submitted', 'roles': None},  # None = author only
    'review': {'from': ['submitted'], 'to': 'under_review', 'roles': [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR, Role.CONFESSION_LEADER]},
    'approve': {'from': ['under_review'], 'to': 'approved', 'roles': [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR, Role.CONFESSION_LEADER]},
    'reject': {'from': ['under_review'], 'to': 'rejected', 'roles': [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR, Role.CONFESSION_LEADER]},
}


class ConfessionTransitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        if action not in TRANSITIONS:
            return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            confession = Confession.objects.select_related('author', 'organization__leader').get(pk=pk)
        except Confession.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        transition = TRANSITIONS[action]
        user = request.user

        # Check current status allows this transition
        if confession.status not in transition['from']:
            return Response(
                {'detail': f'Cannot {action} a confession with status "{confession.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check role permission
        if transition['roles'] is None:
            # Author-only action (submit)
            if confession.author != user:
                return Response({'detail': 'Only the author can submit.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            if not (user.role and user.role.name in transition['roles']):
                return Response({'detail': 'Insufficient permissions.'}, status=status.HTTP_403_FORBIDDEN)
            # Confession leaders can only act on their org's confessions
            if user.role.name == Role.CONFESSION_LEADER and confession.organization.leader != user:
                return Response({'detail': 'Not your organization.'}, status=status.HTTP_403_FORBIDDEN)

        confession.status = transition['to']
        confession.save(update_fields=['status', 'updated_at'])

        return Response(ConfessionListSerializer(confession, context={'request': request}).data)
