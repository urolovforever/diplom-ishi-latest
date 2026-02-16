from django.contrib import admin
from .models import ActivityLog, AnomalyReport, AIModelConfig

admin.site.register(ActivityLog)
admin.site.register(AnomalyReport)
admin.site.register(AIModelConfig)
