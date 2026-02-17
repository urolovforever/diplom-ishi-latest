from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('confessions', '0002_add_e2e_encryption'),
    ]

    operations = [
        migrations.AddField(
            model_name='confession',
            name='confession_type',
            field=models.CharField(
                choices=[('diniy', 'Diniy'), ('fuqarolik', 'Fuqarolik')],
                default='diniy',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='confession',
            name='registration_number',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='confession',
            name='legal_address',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='confession',
            name='organization_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='confession',
            name='member_count',
            field=models.IntegerField(default=0),
        ),
    ]
