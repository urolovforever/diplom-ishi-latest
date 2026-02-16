from django.contrib import admin
from .models import Notification, AlertConfig

admin.site.register(Notification)
admin.site.register(AlertConfig)
