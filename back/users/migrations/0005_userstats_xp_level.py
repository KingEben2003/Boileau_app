from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0004_userstats")]
    operations = [
        migrations.AddField(model_name="userstats", name="xp", field=models.IntegerField(default=0)),
        migrations.AddField(model_name="userstats", name="level", field=models.IntegerField(default=1)),
    ]
