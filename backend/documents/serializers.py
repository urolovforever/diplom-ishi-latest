from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Document, DocumentVersion


class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'version_number', 'file', 'change_summary', 'created_by', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_by', 'created_at']


class DocumentListSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    latest_version = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'file', 'uploaded_by',
            'confession', 'is_encrypted', 'latest_version', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']

    def get_latest_version(self, obj):
        version = obj.versions.first()
        if version:
            return DocumentVersionSerializer(version).data
        return None


class DocumentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'description', 'file', 'confession', 'is_encrypted']
        read_only_fields = ['id']
