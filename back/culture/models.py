from django.conf import settings
from django.db import models


class CultureQuestion(models.Model):
    """Question de culture générale stockée en base (CRUD via la console admin)."""

    TYPE_CHOICES = [("qcm", "QCM"), ("true_false", "Vrai/Faux")]
    DIFFICULTY_CHOICES = [("easy", "Facile"), ("medium", "Moyen"), ("hard", "Difficile")]

    theme = models.CharField(max_length=100, db_index=True)
    question = models.TextField()
    options = models.JSONField()        # liste de chaînes
    correct_answer = models.IntegerField()  # index 0-based dans options
    explanation = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="qcm", db_index=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default="medium", db_index=True)

    class Meta:
        ordering = ["theme", "id"]

    def __str__(self):
        return f"[{self.theme}] {self.question[:60]}"


class CultureResult(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="culture_results"
    )
    theme = models.CharField(max_length=100)
    score = models.IntegerField()
    total = models.IntegerField(default=4)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at"]

    def __str__(self):
        return f"{self.user} - {self.theme}: {self.score}/{self.total}"
