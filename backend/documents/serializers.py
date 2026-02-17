from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Document, DocumentVersion, DocumentAccessLog, DocumentEncryptedKey, HoneypotFile
from .utils import validate_document_file


class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'version_number', 'file', 'change_summary', 'created_by', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_by', 'created_at']


class DocumentEncryptedKeyReadSerializer(serializers.ModelSerializer):
    user = serializers.UUIDField(source='user.id')

    class Meta:
        model = DocumentEncryptedKey
        fields = ['user', 'encrypted_key']


class DocumentListSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    latest_version = serializers.SerializerMethodField()
    encrypted_keys = DocumentEncryptedKeyReadSerializer(many=True, read_only=True)
    is_e2e_encrypted = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'file', 'uploaded_by',
            'confession', 'is_encrypted', 'is_e2e_encrypted', 'security_level', 'category',
            'encrypted_keys', 'latest_version', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']

    def get_latest_version(self, obj):
        version = obj.versions.first()
        if version:
            return DocumentVersionSerializer(version).data
        return None

    def get_is_e2e_encrypted(self, obj):
        return obj.encrypted_keys.exists()


class DocumentWriteSerializer(serializers.ModelSerializer):
    encrypted_keys = serializers.ListField(
        child=serializers.DictField(), required=False, write_only=True,
    )
    is_e2e_encrypted = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'file', 'confession',
            'is_encrypted', 'is_e2e_encrypted', 'security_level', 'category',
            'encrypted_keys',
        ]
        read_only_fields = ['id']

    def validate_file(self, value):
        validate_document_file(value)
        return value

    def create(self, validated_data):
        encrypted_keys_data = validated_data.pop('encrypted_keys', [])
        document = super().create(validated_data)

        for key_data in encrypted_keys_data:
            DocumentEncryptedKey.objects.create(
                document=document,
                user_id=key_data['user'],
                encrypted_key=key_data['encrypted_key'],
            )

        return document

    def update(self, instance, validated_data):
        encrypted_keys_data = validated_data.pop('encrypted_keys', None)
        instance = super().update(instance, validated_data)

        if encrypted_keys_data is not None:
            instance.encrypted_keys.all().delete()
            for key_data in encrypted_keys_data:
                DocumentEncryptedKey.objects.create(
                    document=instance,
                    user_id=key_data['user'],
                    encrypted_key=key_data['encrypted_key'],
                )

        return instance


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = DocumentAccessLog
        fields = ['id', 'document', 'user', 'action', 'ip_address', 'created_at']
        read_only_fields = fields


class HoneypotFileSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    last_accessed_by = UserSerializer(read_only=True)

    class Meta:
        model = HoneypotFile
        fields = [
            'id', 'title', 'description', 'file_path', 'created_by',
            'is_active', 'access_count', 'last_accessed_at', 'last_accessed_by',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'access_count', 'last_accessed_at', 'last_accessed_by', 'created_at']
