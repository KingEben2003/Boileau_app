import datetime
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('documents', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SpacedRepetition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('next_review', models.DateField()),
                ('interval_days', models.IntegerField(default=1)),
                ('ease_factor', models.FloatField(default=2.5)),
                ('repetitions', models.IntegerField(default=0)),
                ('last_score', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='srs_entries', to='documents.document')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='srs_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('user', 'document')}},
        ),
    ]
