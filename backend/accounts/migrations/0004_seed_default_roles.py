from django.db import migrations


ROLES = [
    ('super_admin', "Tizimga to'liq kirish huquqi"),
    ('konfessiya_rahbari', 'Konfessiya rahbari - konfessiyalarni boshqarish'),
    ('konfessiya_xodimi', 'Konfessiya xodimi - oddiy kirish'),
    ('dt_rahbar', 'Diniy tashkilot rahbari - diniy tashkilotni boshqarish'),
    ('dt_xodimi', 'Diniy tashkilot xodimi - oddiy kirish'),
]


def create_roles(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    for name, description in ROLES:
        Role.objects.get_or_create(name=name, defaults={'description': description})


def remove_roles(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    Role.objects.filter(name__in=[name for name, _ in ROLES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_add_is_2fa_confirmed'),
    ]

    operations = [
        migrations.RunPython(create_roles, remove_roles),
    ]
