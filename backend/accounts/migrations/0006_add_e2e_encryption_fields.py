from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_add_sms_2fa_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='public_key',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='encrypted_private_key',
            field=models.TextField(blank=True, null=True),
        ),
    ]
