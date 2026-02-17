from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Organization, Confession, ConfessionEncryptedKey


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


class ConfessionEncryptedKeyReadSerializer(serializers.ModelSerializer):
    user = serializers.UUIDField(source='user.id')

    class Meta:
        model = ConfessionEncryptedKey
        fields = ['user', 'encrypted_key']


class ConfessionListSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    encrypted_keys = ConfessionEncryptedKeyReadSerializer(many=True, read_only=True)

    class Meta:
        model = Confession
        fields = [
            'id', 'title', 'content', 'author', 'organization', 'organization_name',
            'status', 'is_anonymous', 'is_e2e_encrypted', 'encrypted_keys',
            'created_at', 'updated_at',
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
    encrypted_keys = serializers.ListField(
        child=serializers.DictField(), required=False, write_only=True,
    )

    class Meta:
        model = Confession
        fields = ['id', 'title', 'content', 'organization', 'is_anonymous', 'is_e2e_encrypted', 'encrypted_keys']
        read_only_fields = ['id']

    def create(self, validated_data):
        encrypted_keys_data = validated_data.pop('encrypted_keys', [])
        confession = super().create(validated_data)

        for key_data in encrypted_keys_data:
            ConfessionEncryptedKey.objects.create(
                confession=confession,
                user_id=key_data['user'],
                encrypted_key=key_data['encrypted_key'],
            )

        return confession

    def update(self, instance, validated_data):
        encrypted_keys_data = validated_data.pop('encrypted_keys', None)
        instance = super().update(instance, validated_data)

        if encrypted_keys_data is not None:
            instance.encrypted_keys.all().delete()
            for key_data in encrypted_keys_data:
                ConfessionEncryptedKey.objects.create(
                    confession=instance,
                    user_id=key_data['user'],
                    encrypted_key=key_data['encrypted_key'],
                )

        return instance


class ConfessionStatusSerializer(serializers.Serializer):
    """Used for status transition validation only."""
    pass
