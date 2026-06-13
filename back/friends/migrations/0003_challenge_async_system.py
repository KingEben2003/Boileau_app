import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("friends", "0002_challenge_challenger_score_challenge_difficulty_and_more"),
        ("quizzes", "0005_alter_quiz_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Supprimer les champs du mode duel temps réel ────────────────────
        migrations.RemoveField(model_name="challenge", name="rounds"),
        migrations.RemoveField(model_name="challenge", name="themes"),
        migrations.RemoveField(model_name="challenge", name="timer_seconds"),
        migrations.RemoveField(model_name="challenge", name="difficulty"),
        migrations.RemoveField(model_name="challenge", name="end_condition"),
        migrations.RemoveField(model_name="challenge", name="num_questions"),
        migrations.RemoveField(model_name="challenge", name="types"),

        # ── Ajouter les nouveaux champs du défi asynchrone ──────────────────
        migrations.AddField(
            model_name="challenge",
            name="quiz",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="challenges",
                to="quizzes.quiz",
            ),
        ),
        migrations.AddField(
            model_name="challenge",
            name="challenger_answers",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="challenge",
            name="opponent_answers",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="challenge",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),

        # ── Modifier les champs de score (int → float nullable) ─────────────
        migrations.AlterField(
            model_name="challenge",
            name="challenger_score",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="challenge",
            name="opponent_score",
            field=models.FloatField(blank=True, null=True),
        ),

        # ── Créer le modèle Notification ─────────────────────────────────────
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(
                    choices=[
                        ("challenge_received", "Défi reçu"),
                        ("challenge_refused", "Défi refusé"),
                        ("challenge_result", "Résultat de défi"),
                    ],
                    max_length=30,
                )),
                ("message", models.CharField(max_length=255)),
                ("is_read", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("challenge", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    to="friends.challenge",
                )),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="notifications",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
