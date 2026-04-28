from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_passwordresettoken_confirmed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='language',
            field=models.CharField(
                choices=[('uz', "O'zbek"), ('ru', 'Русский'), ('en', 'English')],
                default='uz',
                max_length=5,
            ),
        ),
    ]
