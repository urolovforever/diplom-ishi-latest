from django.urls import path
from . import views

app_name = 'audit'

urlpatterns = [
    path('logs/', views.AuditLogListView.as_view(), name='audit-log-list'),
    path('reports/', views.ReportListCreateView.as_view(), name='report-list'),
    path('reports/<uuid:pk>/download/', views.ReportDownloadView.as_view(), name='report-download'),
]
