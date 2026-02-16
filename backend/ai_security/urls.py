from django.urls import path
from . import views

app_name = 'ai_security'

urlpatterns = [
    path('activity-logs/', views.ActivityLogListView.as_view(), name='activity-log-list'),
    path('anomaly-reports/', views.AnomalyReportListCreateView.as_view(), name='anomaly-report-list'),
    path('anomaly-reports/<uuid:pk>/', views.AnomalyReportDetailView.as_view(), name='anomaly-report-detail'),
    path('ai-configs/', views.AIModelConfigListCreateView.as_view(), name='ai-config-list'),
    path('ai-configs/<uuid:pk>/', views.AIModelConfigDetailView.as_view(), name='ai-config-detail'),
]
