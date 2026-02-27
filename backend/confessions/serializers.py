from rest_framework import serializers
from accounts.models import Role
from accounts.serializers import UserSerializer
from .models import Organization


class OrganizationChildSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'description', 'org_type', 'leader',
            'is_active', 'children_count', 'created_at', 'updated_at',
        ]

    def get_children_count(self, obj):
        return obj.children.count()


class OrganizationListSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)
    children = OrganizationChildSerializer(many=True, read_only=True)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'description', 'org_type', 'parent',
            'leader', 'is_active', 'children', 'members_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.members.count()


class OrganizationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'org_type', 'parent', 'leader', 'is_active']
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

            # qomita_rahbar → faqat o'z qomitasiga tegishli konfessiyalarga
            if role_name == Role.QOMITA_RAHBAR:
                if org.org_type == 'qomita':
                    raise serializers.ValidationError(
                        {"leader": "Qo'mita rahbarini faqat Super Admin tayinlay oladi."}
                    )
                if org.org_type == 'konfessiya' and org.parent_id != user.confession_id:
                    raise serializers.ValidationError(
                        {"leader": "Siz faqat o'z qo'mitangizdagi konfessiyalarga rahbar tayinlaysiz."}
                    )
                if org.org_type == 'diniy_tashkilot':
                    # DT ning parent konfessiya bo'lishi kerak va u qomitaga tegishli
                    parent_conf = org.parent
                    if not parent_conf or parent_conf.parent_id != user.confession_id:
                        raise serializers.ValidationError(
                            {"leader": "Siz faqat o'z qo'mitangizdagi tashkilotlarga rahbar tayinlaysiz."}
                        )
                return data

            # konfessiya_rahbari → faqat o'z konfessiyasiga tegishli DT larga
            if role_name == Role.KONFESSIYA_RAHBARI:
                if org.org_type in ('qomita', 'konfessiya'):
                    raise serializers.ValidationError(
                        {"leader": "Siz bu turdagi tashkilotga rahbar tayinlay olmaysiz."}
                    )
                if org.org_type == 'diniy_tashkilot' and org.parent_id != user.confession_id:
                    raise serializers.ValidationError(
                        {"leader": "Siz faqat o'z konfessiyangizdagi DT larga rahbar tayinlaysiz."}
                    )
                return data

            # Boshqa rollar rahbar tayinlay olmaydi
            raise serializers.ValidationError(
                {"leader": "Sizda rahbar tayinlash huquqi yo'q."}
            )

        return data
