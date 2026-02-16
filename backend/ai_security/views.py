from rest_framework import generics, filters

from accounts.permissions import IsSuperAdmin, IsQomitaRahbar
from .models import ActivityLog, AnomalyReport, AIModelConfig
from .serializers import (
    ActivityLogSerializer,
    AnomalyReportSerializer,
    AnomalyReportWriteSerializer,
    AIModelConfigSerializer,
)


class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsQomitaRahbar]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'resource', 'ip_address']
    ordering_fields = ['created_at', 'response_status']

    def get_queryset(self):
        return ActivityLog.objects.select_related('user__role').all()


class AnomalyReportListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = AnomalyReport.objects.select_related('user__role').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AnomalyReportWriteSerializer
        return AnomalyReportSerializer


class AnomalyReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = AnomalyReport.objects.select_related('user__role').all()
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AnomalyReportWriteSerializer
        return AnomalyReportSerializer


class AIModelConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsSuperAdmin]
    queryset = AIModelConfig.objects.all()


class AIModelConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsSuperAdmin]
    queryset = AIModelConfig.objects.all()
    lookup_field = 'pk'
