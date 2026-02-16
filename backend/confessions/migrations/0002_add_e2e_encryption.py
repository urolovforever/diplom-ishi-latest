import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('confessions', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='confession',
            name='is_e2e_encrypted',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='ConfessionEncryptedKey',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('encrypted_key', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('confession', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='encrypted_keys', to='confessions.confession')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='confession_encrypted_keys', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('confession', 'user')},
            },
        ),
    ]
