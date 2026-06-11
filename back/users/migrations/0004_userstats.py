import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_appuser_remove_user_google_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserStats',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_quizzes', models.IntegerField(default=0)),
                ('total_score', models.FloatField(default=0.0)),
                ('current_streak', models.IntegerField(default=0)),
                ('last_activity', models.DateField(blank=True, null=True)),
                ('badges', models.JSONField(default=list)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='stats',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
