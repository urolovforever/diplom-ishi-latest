from django.utils import timezone
from rest_framework import generics, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSuperAdmin, IsQomitaRahbar, IsSecurityAuditor, IsITAdmin, has_role
from accounts.models import Role
from .models import ActivityLog, AnomalyReport, AIModelConfig
from .serializers import (
    ActivityLogSerializer,
    AnomalyReportSerializer,
    AnomalyReportWriteSerializer,
    AIModelConfigSerializer,
    DashboardStatsSerializer,
)


class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsQomitaRahbar | IsSecurityAuditor]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'resource', 'ip_address']
    ordering_fields = ['created_at', 'response_status']

    def get_queryset(self):
        return ActivityLog.objects.select_related('user__role').all()


class AnomalyReportListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor]
    queryset = AnomalyReport.objects.select_related('user__role', 'reviewed_by__role').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AnomalyReportWriteSerializer
        return AnomalyReportSerializer


class AnomalyReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor]
    queryset = AnomalyReport.objects.select_related('user__role', 'reviewed_by__role').all()
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AnomalyReportWriteSerializer
        return AnomalyReportSerializer


class AIModelConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsSuperAdmin | IsITAdmin]
    queryset = AIModelConfig.objects.all()


class AIModelConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsSuperAdmin | IsITAdmin]
    queryset = AIModelConfig.objects.all()
    lookup_field = 'pk'


class AnomalyDashboardView(APIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor | IsITAdmin]

    def get(self, request):
        total = AnomalyReport.objects.count()
        unreviewed = AnomalyReport.objects.filter(reviewed_by__isnull=True).count()
        resolved = AnomalyReport.objects.filter(is_resolved=True).count()
        critical = AnomalyReport.objects.filter(severity='critical', is_resolved=False).count()

        recent = AnomalyReport.objects.order_by('-detected_at')[:10]

        model_config = AIModelConfig.objects.filter(
            is_active=True, model_type='isolation_forest'
        ).first()
        model_status = None
        if model_config:
            model_status = {
                'name': model_config.name,
                'last_trained_at': model_config.last_trained_at,
                'training_samples_count': model_config.training_samples_count,
                'threshold': model_config.threshold,
                'is_active': model_config.is_active,
            }

        data = {
            'total_anomalies': total,
            'unreviewed_count': unreviewed,
            'resolved_count': resolved,
            'critical_count': critical,
            'recent_anomalies': AnomalyReportSerializer(recent, many=True).data,
            'model_status': model_status,
        }
        return Response(data)


class AIModelStatusView(APIView):
    permission_classes = [IsSuperAdmin | IsITAdmin]

    def get(self, request):
        config = AIModelConfig.objects.filter(
            is_active=True, model_type='isolation_forest'
        ).first()
        if not config:
            return Response({'detail': 'No active AI model configured.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AIModelConfigSerializer(config).data)


class ManualScanView(APIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor | IsITAdmin]

    def post(self, request):
        from .tasks import scan_recent_activity
        scan_recent_activity.delay()
        return Response({'detail': 'Scan initiated.'}, status=status.HTTP_202_ACCEPTED)


class ModelEvaluationView(APIView):
    """Evaluate the AI model and return Precision, Recall, F1 metrics."""
    permission_classes = [IsSuperAdmin | IsITAdmin]

    def get(self, request):
        from accounts.models import CustomUser
        from .features import extract_user_features, features_to_vector
        from .training import ModelTrainer

        users = CustomUser.objects.filter(is_active=True)
        feature_matrix = []

        for user in users:
            features = extract_user_features(user, hours=24)
            vector = features_to_vector(features)
            if any(v != 0 for v in vector):
                feature_matrix.append(vector)

        if len(feature_matrix) < 10:
            return Response({
                'detail': 'Not enough data for evaluation.',
                'samples': len(feature_matrix),
            }, status=status.HTTP_400_BAD_REQUEST)

        trainer = ModelTrainer()
        metrics = trainer.evaluate_model(feature_matrix)

        return Response({
            'metrics': metrics,
            'feature_names': list(
                __import__('ai_security.features', fromlist=['FEATURE_NAMES']).FEATURE_NAMES
            ),
        })


class ReviewAnomalyView(APIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor]

    def post(self, request, pk):
        try:
            report = AnomalyReport.objects.get(pk=pk)
        except AnomalyReport.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_false_positive = request.data.get('is_false_positive', False)
        report.is_false_positive = is_false_positive
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        if request.data.get('resolve', False):
            report.is_resolved = True
            report.resolved_at = timezone.now()
        report.save()
        return Response(AnomalyReportSerializer(report).data)
