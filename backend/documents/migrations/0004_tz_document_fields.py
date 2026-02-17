from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0003_add_e2e_encryption'),
    ]

    operations = [
        # Add is_e2e_encrypted field
        migrations.AddField(
            model_name='document',
            name='is_e2e_encrypted',
            field=models.BooleanField(default=False),
        ),
        # Add file_size_mb field
        migrations.AddField(
            model_name='document',
            name='file_size_mb',
            field=models.FloatField(blank=True, null=True),
        ),
        # Add file_type field
        migrations.AddField(
            model_name='document',
            name='file_type',
            field=models.CharField(blank=True, max_length=50),
        ),
        # Update category choices and default
        migrations.AlterField(
            model_name='document',
            name='category',
            field=models.CharField(
                choices=[
                    ('registration', "Ro'yxatga olish hujjatlari"),
                    ('reports', 'Hisobotlar'),
                    ('normative', "Me'yoriy hujjatlar"),
                    ('confidential', 'Maxfiy hujjatlar'),
                ],
                default='registration',
                max_length=20,
            ),
        ),
    ]
