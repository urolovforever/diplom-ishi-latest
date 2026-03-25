from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_sessionterminationcode'),
    ]

    operations = [
        migrations.AddField(
            model_name='passwordresettoken',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
