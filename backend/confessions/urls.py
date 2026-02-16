from django.urls import path
from . import views
from .stats import DashboardStatsView

app_name = 'confessions'

urlpatterns = [
    path('organizations/', views.OrganizationListCreateView.as_view(), name='organization-list'),
    path('organizations/<uuid:pk>/', views.OrganizationDetailView.as_view(), name='organization-detail'),
    path('', views.ConfessionListCreateView.as_view(), name='confession-list'),
    path('<uuid:pk>/', views.ConfessionDetailView.as_view(), name='confession-detail'),
    path('<uuid:pk>/<str:action>/', views.ConfessionTransitionView.as_view(), name='confession-transition'),
    path('stats/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
