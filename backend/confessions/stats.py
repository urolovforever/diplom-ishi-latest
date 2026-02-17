from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CustomUser, Role
from ai_security.models import AnomalyReport, ActivityLog
from confessions.models import Confession, Organization
from documents.models import Document, DocumentAccessLog
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

        # --- Enhanced stats for admin dashboard ---
        if is_admin:
            # Confession type breakdown (diniy / fuqarolik)
            type_stats = qs.values('confession_type').annotate(count=Count('id'))
            stats['confession_types'] = {
                item['confession_type']: item['count'] for item in type_stats
            }

            # Document category breakdown
            doc_cats = Document.objects.values('category').annotate(count=Count('id'))
            stats['document_categories'] = {
                item['category']: item['count'] for item in doc_cats
            }

            # Users by role
            role_stats = CustomUser.objects.filter(
                is_active=True, role__isnull=False,
            ).values('role__name').annotate(count=Count('id'))
            stats['users_by_role'] = {
                item['role__name']: item['count'] for item in role_stats
            }
            stats['total_users'] = CustomUser.objects.filter(is_active=True).count()

            # AI anomaly stats
            stats['anomalies_total'] = AnomalyReport.objects.count()
            stats['anomalies_unresolved'] = AnomalyReport.objects.filter(is_resolved=False).count()
            stats['anomalies_critical'] = AnomalyReport.objects.filter(
                severity='critical', is_resolved=False,
            ).count()

            # Weekly activity trend (last 7 days)
            activity_data = []
            for i in range(6, -1, -1):
                day = timezone.now().date() - timedelta(days=i)
                day_start = timezone.make_aware(
                    timezone.datetime.combine(day, timezone.datetime.min.time())
                )
                day_end = day_start + timedelta(days=1)
                normal_count = ActivityLog.objects.filter(
                    created_at__gte=day_start, created_at__lt=day_end,
                ).count()
                anomaly_count = AnomalyReport.objects.filter(
                    detected_at__gte=day_start, detected_at__lt=day_end,
                ).count()
                activity_data.append({
                    'date': day.strftime('%m/%d'),
                    'normal': normal_count,
                    'anomaly': anomaly_count,
                })
            stats['activity_data'] = activity_data

            # Recent alerts (last 10 anomalies)
            recent_alerts = AnomalyReport.objects.order_by('-detected_at')[:10]
            stats['recent_alerts'] = [
                {
                    'id': str(a.id),
                    'title': a.title,
                    'severity': a.severity,
                    'detected_at': a.detected_at.isoformat(),
                    'is_resolved': a.is_resolved,
                }
                for a in recent_alerts
            ]

            # Recent documents (last 5)
            recent_docs = Document.objects.select_related('uploaded_by').order_by('-created_at')[:5]
            stats['recent_documents'] = [
                {
                    'id': str(d.id),
                    'title': d.title,
                    'security_level': d.security_level,
                    'is_e2e_encrypted': d.is_e2e_encrypted,
                    'created_at': d.created_at.isoformat(),
                    'uploaded_by': {
                        'email': d.uploaded_by.email,
                        'full_name': d.uploaded_by.get_full_name(),
                    } if d.uploaded_by else None,
                }
                for d in recent_docs
            ]

        return Response(stats)
