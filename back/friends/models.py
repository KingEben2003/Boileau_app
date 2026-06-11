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
        ("declined", "Refusé"),
        ("completed", "Terminé"),
    ]
    END_CONDITIONS = [
        ("best_score", "Meilleur score"),
        ("elimination", "Élimination"),
    ]

    challenger = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_challenges"
    )
    opponent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_challenges"
    )
    rounds = models.IntegerField(default=5)
    themes = models.JSONField(default=list)
    timer_seconds = models.IntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    # Paramètres du défi multijoueur temps réel
    num_questions = models.IntegerField(default=10)
    types = models.JSONField(default=list)            # ex: ["qcm", "true_false"]
    difficulty = models.CharField(max_length=10, default="medium")
    end_condition = models.CharField(max_length=20, choices=END_CONDITIONS, default="best_score")

    # Résultat (rempli à la fin par le consumer)
    challenger_score = models.IntegerField(default=0)
    opponent_score = models.IntegerField(default=0)
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="won_challenges",
    )

    def __str__(self):
        return f"{self.challenger} vs {self.opponent} ({self.status})"
