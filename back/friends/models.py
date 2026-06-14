from django.conf import settings
from django.db import models


class FriendRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("accepted", "Accepté"),
        ("declined", "Refusé"),
    ]
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_requests"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_requests"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("from_user", "to_user")

    def __str__(self):
        return f"{self.from_user} → {self.to_user} ({self.status})"


class Challenge(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("accepted", "Accepté"),
        ("refused", "Refusé"),
        ("completed", "Terminé"),
    ]

    challenger = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_challenges"
    )
    opponent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_challenges"
    )
    # Quiz sur lequel porte le défi (quiz du challenger)
    quiz = models.ForeignKey(
        "quizzes.Quiz", on_delete=models.CASCADE, related_name="challenges",
        null=True, blank=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Score en % (0-100)
    challenger_score = models.FloatField(null=True, blank=True)
    opponent_score = models.FloatField(null=True, blank=True)

    # Réponses détaillées {str(question_id): answer}
    challenger_answers = models.JSONField(null=True, blank=True)
    opponent_answers = models.JSONField(null=True, blank=True)

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="won_challenges",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.challenger} vs {self.opponent} ({self.status})"


class Notification(models.Model):
    TYPE_CHOICES = [
        ("challenge_received", "Défi reçu"),
        ("challenge_refused", "Défi refusé"),
        ("challenge_result", "Résultat de défi"),
        ("feature_request", "Demande de fonctionnalité"),
        ("feature_approved", "Fonctionnalité activée"),
        ("feature_refused", "Fonctionnalité refusée"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, null=True, blank=True
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.type}] → {self.user} : {self.message[:40]}"
