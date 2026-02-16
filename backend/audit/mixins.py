from .models import AuditLog


class AuditMixin:
    """Mixin for DRF views to automatically log create/update/delete actions."""

    def perform_create(self, serializer):
        instance = serializer.save()
        self._create_audit_log('create', instance)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._create_audit_log('update', instance)
        return instance

    def perform_destroy(self, instance):
        self._create_audit_log('delete', instance)
        instance.delete()

    def _create_audit_log(self, action, instance):
        request = self.request
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
