from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_security', '0002_aimodelconfig_last_trained_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='activitylog',
            name='resource_type',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='activitylog',
            name='resource_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='activitylog',
            name='details',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
