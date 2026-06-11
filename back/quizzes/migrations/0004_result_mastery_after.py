from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quizzes", "0003_result_answers_detail_time_spent")]
    operations = [
        migrations.AddField(model_name="result", name="mastery_after", field=models.FloatField(blank=True, null=True)),
    ]
