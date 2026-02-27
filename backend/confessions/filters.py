import django_filters

from .models import Organization


class OrganizationFilter(django_filters.FilterSet):
    confession = django_filters.UUIDFilter(field_name='confession__id')
    is_active = django_filters.BooleanFilter(field_name='is_active')

    class Meta:
        model = Organization
        fields = ['confession', 'is_active']
