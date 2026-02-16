from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from confessions.models import Confession, Organization
from documents.models import Document
from notifications.models import Notification


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]

        if is_admin:
            confessions_count = Confession.objects.count()
            documents_count = Document.objects.count()
            organizations_count = Organization.objects.count()
        else:
            confessions_count = Confession.objects.filter(author=user).count()
            documents_count = Document.objects.filter(uploaded_by=user).count()
            organizations_count = Organization.objects.filter(leader=user).count()

        notifications_count = Notification.objects.filter(recipient=user, is_read=False).count()

        stats = {
            'confessions': confessions_count,
            'documents': documents_count,
            'notifications': notifications_count,
            'organizations': organizations_count,
        }

        # Status breakdown
        if is_admin:
            qs = Confession.objects
        else:
            qs = Confession.objects.filter(author=user)

        for s in ['draft', 'submitted', 'under_review', 'approved', 'rejected']:
            stats[f'confessions_{s}'] = qs.filter(status=s).count()

        return Response(stats)
