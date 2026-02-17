import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0002_document_category_document_security_level_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DocumentEncryptedKey',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('encrypted_key', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='encrypted_keys', to='documents.document')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='document_encrypted_keys', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('document', 'user')},
            },
        ),
    ]
