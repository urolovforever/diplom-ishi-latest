import io
import logging
from datetime import timedelta

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

logger = logging.getLogger(__name__)


class ReportGenerator:

    @staticmethod
    def activity_report(date_from=None, date_to=None):
        from ai_security.models import ActivityLog

        qs = ActivityLog.objects.select_related('user').all()
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        total = qs.count()
        by_method = {}
        by_status = {}
        for log in qs[:1000]:
            method = log.request_method or 'N/A'
            by_method[method] = by_method.get(method, 0) + 1
            status_group = f'{(log.response_status or 0) // 100}xx'
            by_status[status_group] = by_status.get(status_group, 0) + 1

        return {
            'title': 'Activity Report',
            'total_requests': total,
            'by_method': by_method,
            'by_status': by_status,
            'period': {
                'from': str(date_from) if date_from else 'All time',
                'to': str(date_to) if date_to else 'Now',
            },
        }

    @staticmethod
    def security_report(date_from=None, date_to=None):
        from ai_security.models import AnomalyReport
        from accounts.models import LoginAttempt

        anomaly_qs = AnomalyReport.objects.all()
        login_qs = LoginAttempt.objects.all()

        if date_from:
            anomaly_qs = anomaly_qs.filter(detected_at__gte=date_from)
            login_qs = login_qs.filter(created_at__gte=date_from)
        if date_to:
            anomaly_qs = anomaly_qs.filter(detected_at__lte=date_to)
            login_qs = login_qs.filter(created_at__lte=date_to)

        return {
            'title': 'Security Report',
            'total_anomalies': anomaly_qs.count(),
            'resolved_anomalies': anomaly_qs.filter(is_resolved=True).count(),
            'critical_anomalies': anomaly_qs.filter(severity='critical').count(),
            'total_login_attempts': login_qs.count(),
            'failed_login_attempts': login_qs.filter(success=False).count(),
            'period': {
                'from': str(date_from) if date_from else 'All time',
                'to': str(date_to) if date_to else 'Now',
            },
        }

    @staticmethod
    def confession_report(date_from=None, date_to=None):
        from confessions.models import Confession

        qs = Confession.objects.all()
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        by_status = {}
        for c in qs:
            by_status[c.status] = by_status.get(c.status, 0) + 1

        return {
            'title': 'Confession Report',
            'total_confessions': qs.count(),
            'by_status': by_status,
            'anonymous_count': qs.filter(is_anonymous=True).count(),
            'period': {
                'from': str(date_from) if date_from else 'All time',
                'to': str(date_to) if date_to else 'Now',
            },
        }

    @staticmethod
    def export_pdf(report_data):
        """Generate PDF from report data and return bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], fontSize=18)
        heading_style = ParagraphStyle('ReportHeading', parent=styles['Heading2'], fontSize=14)

        elements = []

        # Title
        elements.append(Paragraph(report_data.get('title', 'Report'), title_style))
        elements.append(Spacer(1, 12))

        # Period
        period = report_data.get('period', {})
        elements.append(Paragraph(
            f"Period: {period.get('from', 'N/A')} - {period.get('to', 'N/A')}",
            styles['Normal'],
        ))
        elements.append(Spacer(1, 12))

        # Build tables from report data
        for key, value in report_data.items():
            if key in ('title', 'period'):
                continue

            if isinstance(value, dict):
                elements.append(Paragraph(key.replace('_', ' ').title(), heading_style))
                elements.append(Spacer(1, 6))
                table_data = [['Key', 'Value']]
                for k, v in value.items():
                    table_data.append([str(k), str(v)])
                table = Table(table_data, colWidths=[3 * inch, 3 * inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 12))
            else:
                elements.append(Paragraph(
                    f"<b>{key.replace('_', ' ').title()}:</b> {value}",
                    styles['Normal'],
                ))
                elements.append(Spacer(1, 6))

        # Generated timestamp
        elements.append(Spacer(1, 24))
        elements.append(Paragraph(
            f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            styles['Normal'],
        ))

        doc.build(elements)
        return buffer.getvalue()
