from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quizzes', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='result',
            name='time_spent_seconds',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='result',
            name='answers_detail',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
