from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    path('', views.DocumentListCreateView.as_view(), name='document-list'),
    path('<uuid:pk>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('<uuid:pk>/download/', views.DocumentDownloadView.as_view(), name='document-download'),
    path('<uuid:doc_pk>/versions/', views.DocumentVersionListCreateView.as_view(), name='document-version-list'),
    path('<uuid:doc_pk>/versions/diff/', views.DocumentVersionDiffView.as_view(), name='document-version-diff'),
    path('access-logs/', views.DocumentAccessLogListView.as_view(), name='document-access-logs'),
    path('honeypot/', views.HoneypotFileListCreateView.as_view(), name='honeypot-list'),
    path('honeypot/<uuid:pk>/', views.HoneypotFileDetailView.as_view(), name='honeypot-detail'),
    path('honeypot/<uuid:pk>/access/', views.HoneypotAccessView.as_view(), name='honeypot-access'),
]
