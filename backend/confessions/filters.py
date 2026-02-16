import django_filters

from .models import Confession


class ConfessionFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    organization = django_filters.UUIDFilter(field_name='organization__id')
    is_anonymous = django_filters.BooleanFilter(field_name='is_anonymous')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    author = django_filters.UUIDFilter(field_name='author__id')

    class Meta:
        model = Confession
        fields = ['status', 'organization', 'is_anonymous', 'created_after', 'created_before', 'author']
