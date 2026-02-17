from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Document, DocumentVersion, DocumentAccessLog, DocumentEncryptedKey, HoneypotFile
from .utils import validate_document_file


class DocumentEncryptedKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentEncryptedKey
        fields = ['user', 'encrypted_key']


class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'version_number', 'file', 'change_summary', 'created_by', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_by', 'created_at']


class DocumentListSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    latest_version = serializers.SerializerMethodField()
    encrypted_keys = DocumentEncryptedKeySerializer(many=True, read_only=True)

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


class DocumentWriteSerializer(serializers.ModelSerializer):
    encrypted_keys = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)

    class Meta:
        model = Document
        fields = ['id', 'title', 'description', 'file', 'confession', 'is_encrypted', 'is_e2e_encrypted', 'security_level', 'category', 'encrypted_keys']
        read_only_fields = ['id']

    def validate_file(self, value):
        validate_document_file(value)
        return value

    def create(self, validated_data):
        validated_data.pop('encrypted_keys', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('encrypted_keys', None)
        return super().update(instance, validated_data)


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
