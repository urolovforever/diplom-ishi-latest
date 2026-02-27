from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser, Role
from .validators import validate_password_strength
from .permissions import ROLE_CREATION_MAP, ROLE_ORG_TYPE_MAP


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.UUIDField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    has_public_key = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_id', 'is_active', 'is_2fa_enabled',
            'has_public_key', 'confession', 'organization_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_has_public_key(self, obj):
        return bool(obj.public_key)

    def get_organization_name(self, obj):
        if obj.confession:
            return obj.confession.name
        return None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')
        data['user'] = user
        return data


class InviteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role_id = serializers.UUIDField()
    confession_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'first_name', 'last_name', 'password', 'role_id', 'confession_id']

    def validate_password(self, value):
        validate_password_strength(value)
        return value

    def validate_role_id(self, value):
        if not Role.objects.filter(id=value).exists():
            raise serializers.ValidationError('Invalid role.')
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and request.user and request.user.role:
            creator_role = request.user.role.name
            target_role = Role.objects.get(id=data['role_id'])
            allowed_roles = ROLE_CREATION_MAP.get(creator_role, [])
            if target_role.name not in allowed_roles:
                raise serializers.ValidationError(
                    {'role_id': "Siz bu rolda foydalanuvchi yarata olmaysiz."}
                )

            # Tashkilot turi rolga mos kelishini tekshirish
            confession_id = data.get('confession_id')
            if confession_id:
                from confessions.models import Organization
                try:
                    org = Organization.objects.get(id=confession_id)
                except Organization.DoesNotExist:
                    raise serializers.ValidationError(
                        {'confession_id': "Tashkilot topilmadi."}
                    )

                expected_org_type = ROLE_ORG_TYPE_MAP.get(target_role.name)
                if expected_org_type and org.org_type != expected_org_type:
                    raise serializers.ValidationError(
                        {'confession_id': "Tanlangan tashkilot turi bu rolga mos kelmaydi."}
                    )

                # Konfessiya rahbari faqat o'z konfessiyasi ostidagi DT'larga rahbar tayinlay oladi
                if (creator_role == Role.KONFESSIYA_RAHBARI
                        and target_role.name == Role.DT_RAHBAR
                        and request.user.confession):
                    if org.parent_id != request.user.confession_id:
                        raise serializers.ValidationError(
                            {'confession_id': "Siz faqat o'z konfessiyangizga tegishli tashkilotlarga rahbar tayinlay olasiz."}
                        )

        return data

    def create(self, validated_data):
        role_id = validated_data.pop('role_id')
        confession_id = validated_data.pop('confession_id', None)
        role = Role.objects.get(id=role_id)

        request = self.context.get('request')
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=role,
            confession_id=confession_id,
            created_by=request.user if request else None,
        )

        # Rahbar rolida user yaratilsa, avtomatik shu tashkilot rahbari qilinadi
        if confession_id and role.name in [Role.QOMITA_RAHBAR, Role.KONFESSIYA_RAHBARI, Role.DT_RAHBAR]:
            from confessions.models import Organization
            Organization.objects.filter(id=confession_id).update(leader=user)

        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password_strength(value)
        return value

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class Verify2FASerializer(serializers.Serializer):
    token = serializers.CharField(max_length=6)
    user_id = serializers.UUIDField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password_strength(value)
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name']


class PublicKeySerializer(serializers.Serializer):
    public_key = serializers.CharField()
    encrypted_private_key = serializers.CharField(required=False)


class IPRestrictionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        from .models import IPRestriction
        model = IPRestriction
        fields = [
            'id', 'ip_address', 'list_type', 'reason',
            'is_active', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']
