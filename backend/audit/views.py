from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSuperAdmin, IsSecurityAuditor, IsQomitaRahbar
from .models import AuditLog, Report
from .reports import ReportGenerator
from .serializers import AuditLogSerializer, ReportSerializer, ReportGenerateSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin | IsSecurityAuditor]
    filterset_fields = ['user', 'action', 'model_name']

    def get_queryset(self):
        return AuditLog.objects.select_related('user__role').all()


class AuditLogExportCSVView(APIView):
    """Export audit logs as CSV file."""
    permission_classes = [IsSuperAdmin | IsSecurityAuditor]

    def get(self, request):
        import csv
        import io

        qs = AuditLog.objects.select_related('user').all()

        # Apply filters
        user_id = request.query_params.get('user')
        action = request.query_params.get('action')
        model_name = request.query_params.get('model_name')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if action:
            qs = qs.filter(action=action)
        if model_name:
            qs = qs.filter(model_name=model_name)

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['ID', 'User', 'Action', 'Model', 'Object ID', 'Changes', 'IP Address', 'Created At'])

        for log in qs[:5000]:  # Limit to 5000 rows
            writer.writerow([
                str(log.id),
                log.user.email if log.user else '',
                log.action,
                log.model_name,
                str(log.object_id) if log.object_id else '',
                str(log.changes) if log.changes else '',
                log.ip_address or '',
                log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            ])

        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
        return response


class ReportListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor | IsQomitaRahbar]
    queryset = Report.objects.select_related('generated_by__role').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReportGenerateSerializer
        return ReportSerializer

    def create(self, request, *args, **kwargs):
        serializer = ReportGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report_type = serializer.validated_data['report_type']
        date_from = serializer.validated_data.get('date_from')
        date_to = serializer.validated_data.get('date_to')

        generator_map = {
            'activity': ReportGenerator.activity_report,
            'security': ReportGenerator.security_report,
            'confession': ReportGenerator.confession_report,
        }

        generator = generator_map.get(report_type)
        if not generator:
            return Response({'detail': 'Invalid report type.'}, status=status.HTTP_400_BAD_REQUEST)

        report_data = generator(date_from=date_from, date_to=date_to)

        report = Report.objects.create(
            title=report_data['title'],
            report_type=report_type,
            data=report_data,
            generated_by=request.user,
            date_from=date_from,
            date_to=date_to,
        )

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


class ReportDownloadView(APIView):
    permission_classes = [IsSuperAdmin | IsSecurityAuditor | IsQomitaRahbar]

    def get(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        pdf_bytes = ReportGenerator.export_pdf(report.data)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f'{report.title.replace(" ", "_")}_{report.created_at.strftime("%Y%m%d")}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
