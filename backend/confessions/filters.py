import django_filters

from .models import Organization


class OrganizationFilter(django_filters.FilterSet):
    org_type = django_filters.CharFilter(field_name='org_type')
    parent = django_filters.UUIDFilter(field_name='parent__id')
    is_active = django_filters.BooleanFilter(field_name='is_active')

    class Meta:
        model = Organization
        fields = ['org_type', 'parent', 'is_active']
