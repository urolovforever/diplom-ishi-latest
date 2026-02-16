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
]
