"""
Migration de données : popule CultureQuestion depuis le dictionnaire
hardcodé dans culture/questions.py.
correct est stocké comme la réponse textuelle → on cherche son index dans options.
"""

from django.db import migrations


def populate_questions(apps, schema_editor):
    CultureQuestion = apps.get_model("culture", "CultureQuestion")
    # Import lazily pour ne pas dépendre de l'état futur du module
    from culture.questions import CULTURE_QUESTIONS

    rows = []
    for theme, questions in CULTURE_QUESTIONS.items():
        for q in questions:
            options = q.get("options", [])
            correct_text = q.get("correct", "")
            try:
                correct_index = options.index(correct_text)
            except ValueError:
                correct_index = 0  # fallback
            rows.append(
                CultureQuestion(
                    theme=theme,
                    question=q.get("question", ""),
                    options=options,
                    correct_answer=correct_index,
                    explanation=q.get("explanation", ""),
                )
            )
    CultureQuestion.objects.bulk_create(rows)


def depopulate_questions(apps, schema_editor):
    CultureQuestion = apps.get_model("culture", "CultureQuestion")
    CultureQuestion.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("culture", "0002_add_culturequestion"),
    ]

    operations = [
        migrations.RunPython(populate_questions, depopulate_questions),
    ]
