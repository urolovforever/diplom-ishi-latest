from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from .models import CustomUser, Role
from .validators import validate_password_strength
from .permissions import ROLE_CREATION_MAP, ROLE_ENTITY_MAP


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
    confession_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_id', 'is_active', 'is_2fa_enabled',
            'has_public_key', 'confession', 'organization', 'organization_name',
            'confession_name', 'language', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_has_public_key(self, obj):
        return bool(obj.public_key)

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        if obj.confession:
            return obj.confession.name
        return None

    def get_confession_name(self, obj):
        if obj.organization and obj.organization.confession:
            return obj.organization.confession.name
        if obj.confession:
            return obj.confession.name
        return None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError(_('Invalid email or password.'))
        if not user.is_active:
            raise serializers.ValidationError(_('User account is disabled.'))
        data['user'] = user
        return data


class InviteSerializer(serializers.ModelSerializer):
    role_id = serializers.UUIDField()
    confession_id = serializers.UUIDField(required=False, allow_null=True)
    organization_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'first_name', 'last_name', 'role_id', 'confession_id', 'organization_id']

    def validate_role_id(self, value):
        if not Role.objects.filter(id=value).exists():
            raise serializers.ValidationError(_('Invalid role.'))
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and request.user and request.user.role:
            creator_role = request.user.role.name
            target_role = Role.objects.get(id=data['role_id'])
            allowed_roles = ROLE_CREATION_MAP.get(creator_role, [])
            if target_role.name not in allowed_roles:
                raise serializers.ValidationError(
                    {'role_id': _("Siz bu rolda foydalanuvchi yarata olmaysiz.")}
                )

            # Determine entity type for the target role
            entity_type = ROLE_ENTITY_MAP.get(target_role.name)

            if entity_type == 'confession':
                confession_id = data.get('confession_id')

                # Konfessiya rahbari uchun avtomatik o'z konfessiyasini tayinlash
                if not confession_id and creator_role == Role.KONFESSIYA_RAHBARI and request.user.confession_id:
                    data['confession_id'] = request.user.confession_id
                    confession_id = request.user.confession_id

                if not confession_id:
                    raise serializers.ValidationError(
                        {'confession_id': _("Bu rol uchun konfessiya tanlash majburiy.")}
                    )
                from confessions.models import Confession
                try:
                    Confession.objects.get(id=confession_id)
                except Confession.DoesNotExist:
                    raise serializers.ValidationError(
                        {'confession_id': _("Konfessiya topilmadi.")}
                    )

            elif entity_type == 'organization':
                organization_id = data.get('organization_id')
                if not organization_id:
                    raise serializers.ValidationError(
                        {'organization_id': _("Bu rol uchun tashkilot tanlash majburiy.")}
                    )
                from confessions.models import Organization
                try:
                    org = Organization.objects.get(id=organization_id)
                except Organization.DoesNotExist:
                    raise serializers.ValidationError(
                        {'organization_id': _("Tashkilot topilmadi.")}
                    )

                # Konfessiya rahbari faqat o'z konfessiyasi ostidagi DT'larga rahbar tayinlay oladi
                if (creator_role == Role.KONFESSIYA_RAHBARI
                        and target_role.name == Role.DT_RAHBAR
                        and request.user.confession):
                    if org.confession_id != request.user.confession_id:
                        raise serializers.ValidationError(
                            {'organization_id': _("Siz faqat o'z konfessiyangizga tegishli tashkilotlarga rahbar tayinlay olasiz.")}
                        )

        return data

    def create(self, validated_data):
        role_id = validated_data.pop('role_id')
        confession_id = validated_data.pop('confession_id', None)
        organization_id = validated_data.pop('organization_id', None)
        role = Role.objects.get(id=role_id)

        entity_type = ROLE_ENTITY_MAP.get(role.name)

        request = self.context.get('request')
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=None,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=role,
            confession_id=confession_id if entity_type == 'confession' else None,
            organization_id=organization_id if entity_type == 'organization' else None,
            created_by=request.user if request else None,
        )
        user.set_unusable_password()
        user.save(update_fields=['password'])

        # Rahbar rolida user yaratilsa, avtomatik shu tashkilot/konfessiya rahbari qilinadi
        if role.name == Role.KONFESSIYA_RAHBARI and confession_id:
            from confessions.models import Confession
            Confession.objects.filter(id=confession_id).update(leader=user)
        elif role.name == Role.DT_RAHBAR and organization_id:
            from confessions.models import Organization
            Organization.objects.filter(id=organization_id).update(leader=user)

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
            raise serializers.ValidationError(_('Current password is incorrect.'))
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
        fields = ['first_name', 'last_name', 'language']


class PublicKeySerializer(serializers.Serializer):
    public_key = serializers.CharField()
    encrypted_private_key = serializers.CharField(required=False)


# Common Samsung model codes to friendly names
DEVICE_MODEL_MAP = {
    'SM-A256B': 'Samsung Galaxy A25',
    'SM-A256E': 'Samsung Galaxy A25',
    'SM-A346B': 'Samsung Galaxy A34',
    'SM-A346E': 'Samsung Galaxy A34',
    'SM-A546B': 'Samsung Galaxy A54',
    'SM-A546E': 'Samsung Galaxy A54',
    'SM-S911B': 'Samsung Galaxy S23',
    'SM-S916B': 'Samsung Galaxy S23+',
    'SM-S918B': 'Samsung Galaxy S23 Ultra',
    'SM-S921B': 'Samsung Galaxy S24',
    'SM-S926B': 'Samsung Galaxy S24+',
    'SM-S928B': 'Samsung Galaxy S24 Ultra',
    'SM-A155F': 'Samsung Galaxy A15',
    'SM-A156B': 'Samsung Galaxy A15 5G',
    'SM-A556B': 'Samsung Galaxy A55',
    'SM-G991B': 'Samsung Galaxy S21',
    'SM-G996B': 'Samsung Galaxy S21+',
    'SM-G998B': 'Samsung Galaxy S21 Ultra',
    'SM-A525F': 'Samsung Galaxy A52',
    'SM-A536B': 'Samsung Galaxy A53',
    'SM-M146B': 'Samsung Galaxy M14',
    'SM-M346B': 'Samsung Galaxy M34',
}


class UserSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()
    device = serializers.SerializerMethodField()

    class Meta:
        from .models import UserSession
        model = UserSession
        fields = ['id', 'ip_address', 'user_agent', 'device', 'is_current', 'is_active', 'last_activity', 'created_at']
        read_only_fields = fields

    def get_is_current(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        current_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        # Compare by checking if the session's refresh token generated the current access token
        return str(obj.id) == self.context.get('current_session_id')

    def get_device(self, obj):
        import re
        ua = obj.user_agent or ''
        if 'Mobile' in ua or 'Android' in ua or 'iPhone' in ua:
            device_type = 'mobile'
        elif 'Tablet' in ua or 'iPad' in ua:
            device_type = 'tablet'
        else:
            device_type = 'desktop'

        # Extract browser
        browser = 'Noma\'lum'
        if 'Firefox' in ua:
            browser = 'Firefox'
        elif 'Edg' in ua:
            browser = 'Edge'
        elif 'Chrome' in ua:
            browser = 'Chrome'
        elif 'Safari' in ua:
            browser = 'Safari'

        # Extract OS (Android/iOS must come before Linux — Android UA contains "Linux")
        os_name = ''
        if 'Android' in ua:
            os_name = 'Android'
        elif 'iPhone' in ua or 'iPad' in ua:
            os_name = 'iOS'
        elif 'Windows' in ua:
            os_name = 'Windows'
        elif 'Mac OS' in ua:
            os_name = 'macOS'
        elif 'Linux' in ua:
            os_name = 'Linux'

        # Extract device model
        model = ''
        if 'Android' in ua:
            # UA format: "Linux; Android 14; SM-A256B" or "Linux; Android 14; Samsung Galaxy A25"
            m = re.search(r'Android\s[\d.]+;\s*([^)]+)', ua)
            if m:
                raw = m.group(1).strip().rstrip(')')
                # Remove "Build/..." suffix
                raw = re.sub(r'\s*Build/.*', '', raw)
                model = DEVICE_MODEL_MAP.get(raw.upper(), raw)
                # Chrome 110+ uses "K" as privacy placeholder — ignore it
                if len(model) <= 1:
                    model = ''
        elif 'iPhone' in ua:
            model = 'iPhone'
        elif 'iPad' in ua:
            model = 'iPad'

        return {'type': device_type, 'browser': browser, 'os': os_name, 'model': model}


class SessionTerminationRequestSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    session_id = serializers.UUIDField()


class SessionTerminationConfirmSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    code = serializers.CharField(max_length=6, min_length=6)


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
