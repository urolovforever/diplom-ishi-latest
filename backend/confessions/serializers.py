from rest_framework import serializers
from accounts.models import Role
from accounts.serializers import UserSerializer
from .models import Confession, Organization


class ConfessionSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)
    organizations_count = serializers.SerializerMethodField()

    class Meta:
        model = Confession
        fields = [
            'id', 'name', 'description', 'leader',
            'is_active', 'organizations_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_organizations_count(self, obj):
        return obj.organizations.count()


class ConfessionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Confession
        fields = ['id', 'name', 'description', 'is_active']


class OrganizationChildSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)
    confession = serializers.UUIDField(source='confession.id', read_only=True)
    confession_name = serializers.CharField(source='confession.name', read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'description', 'leader',
            'is_active', 'confession', 'confession_name',
            'created_at', 'updated_at',
        ]


class OrganizationListSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    confession_name = serializers.CharField(source='confession.name', read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'description', 'confession', 'confession_name',
            'leader', 'is_active', 'members_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.members.count()


class OrganizationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'confession', 'leader', 'is_active']
        read_only_fields = ['id']

    def validate(self, data):
        request = self.context.get('request')
        # Leader o'zgartirilayotganda huquqni tekshirish
        if 'leader' in data and request and request.user:
            new_leader = data['leader']
            user = request.user
            role_name = user.role.name if user.role else None

            # super_admin hamma joyga rahbar tayinlay oladi
            if role_name == Role.SUPER_ADMIN:
                return data

            org = self.instance
            if not org:
                return data

            # User o'zini o'zi rahbar qilib qo'yishni oldini olish
            if new_leader and new_leader.id == user.id:
                raise serializers.ValidationError(
                    {"leader": "O'zingizni rahbar qilib tayinlay olmaysiz."}
                )

            # konfessiya_rahbari → faqat o'z konfessiyasiga tegishli DT larga
            if role_name == Role.KONFESSIYA_RAHBARI:
                if user.confession and org.confession_id != user.confession_id:
                    raise serializers.ValidationError(
                        {"leader": "Siz faqat o'z konfessiyangizdagi DT larga rahbar tayinlaysiz."}
                    )
                return data

            # Boshqa rollar rahbar tayinlay olmaydi
            raise serializers.ValidationError(
                {"leader": "Sizda rahbar tayinlash huquqi yo'q."}
            )

        return data
