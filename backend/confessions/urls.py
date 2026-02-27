from django.urls import path
from . import views
from .stats import DashboardStatsView

app_name = 'confessions'

urlpatterns = [
    path('organizations/', views.OrganizationListCreateView.as_view(), name='organization-list'),
    path('organizations/all/', views.OrganizationAllListView.as_view(), name='organization-all'),
    path('organizations/<uuid:pk>/', views.OrganizationDetailView.as_view(), name='organization-detail'),
    path('stats/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
