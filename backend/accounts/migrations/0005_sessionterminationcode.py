import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_seed_default_roles'),
    ]

    operations = [
        migrations.CreateModel(
            name='SessionTerminationCode',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=6)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('is_used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='session_termination_codes', to=settings.AUTH_USER_MODEL)),
                ('session_to_terminate', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.usersession')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
