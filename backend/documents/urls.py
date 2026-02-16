from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    path('', views.DocumentListCreateView.as_view(), name='document-list'),
    path('<uuid:pk>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('<uuid:doc_pk>/versions/', views.DocumentVersionListCreateView.as_view(), name='document-version-list'),
]
