from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Organization, Confession


class OrganizationListSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)

    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'leader', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrganizationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'leader', 'is_active']
        read_only_fields = ['id']


class ConfessionListSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Confession
        fields = [
            'id', 'title', 'content', 'author', 'organization', 'organization_name',
            'status', 'is_anonymous', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_author(self, obj):
        request = self.context.get('request')
        if obj.is_anonymous and request:
            user = request.user
            # Author can see themselves, leaders+ can see author
            if user == obj.author or (
                user.role and user.role.name in ['super_admin', 'qomita_rahbar', 'confession_leader']
            ):
                return UserSerializer(obj.author).data
            return None
        return UserSerializer(obj.author).data


class ConfessionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Confession
        fields = ['id', 'title', 'content', 'organization', 'is_anonymous']
        read_only_fields = ['id']


class ConfessionStatusSerializer(serializers.Serializer):
    """Used for status transition validation only."""
    pass
