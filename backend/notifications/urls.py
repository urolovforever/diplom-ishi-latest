from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('mark-read/', views.MarkReadView.as_view(), name='mark-read'),
    path('unread-count/', views.UnreadCountView.as_view(), name='unread-count'),
    path('<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('alert-configs/', views.AlertConfigListCreateView.as_view(), name='alert-config-list'),
    path('alert-configs/<uuid:pk>/', views.AlertConfigDetailView.as_view(), name='alert-config-detail'),
    path('alert-rules/', views.AlertRuleListCreateView.as_view(), name='alert-rule-list'),
    path('alert-rules/<uuid:pk>/', views.AlertRuleDetailView.as_view(), name='alert-rule-detail'),
    path('telegram-config/', views.TelegramConfigView.as_view(), name='telegram-config'),
]
