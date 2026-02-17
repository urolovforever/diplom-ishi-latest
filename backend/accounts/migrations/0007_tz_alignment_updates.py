import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_add_e2e_encryption_fields'),
        ('confessions', '0001_initial'),
    ]

    operations = [
        # Update Role choices to TZ-compliant names
        migrations.AlterField(
            model_name='role',
            name='name',
            field=models.CharField(
                choices=[
                    ('super_admin', 'Super Admin'),
                    ('qomita_rahbar', "Qo'mita Rahbari"),
                    ('qomita_xodimi', "Qo'mita Xodimi"),
                    ('konfessiya_rahbari', 'Konfessiya Rahbari'),
                    ('konfessiya_xodimi', 'Konfessiya Xodimi'),
                    ('adliya_xodimi', 'Adliya Xodimi'),
                    ('kengash_azo', "Kengash A'zosi"),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        # Update is_2fa_enabled default to True
        migrations.AlterField(
            model_name='customuser',
            name='is_2fa_enabled',
            field=models.BooleanField(default=True),
        ),
        # Add confession FK
        migrations.AddField(
            model_name='customuser',
            name='confession',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='members',
                to='confessions.organization',
            ),
        ),
        # Add created_by FK
        migrations.AddField(
            model_name='customuser',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_users',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Create IPRestriction model
        migrations.CreateModel(
            name='IPRestriction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('ip_address', models.GenericIPAddressField()),
                ('list_type', models.CharField(choices=[('whitelist', 'Whitelist'), ('blacklist', 'Blacklist')], max_length=10)),
                ('reason', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ip_restrictions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('ip_address', 'list_type')},
            },
        ),
    ]
