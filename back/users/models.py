
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


# Table des administrateurs (hérite de l'utilisateur Django natif)
class User(AbstractUser):
    email = models.EmailField(unique=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    reset_code = models.CharField(max_length=6, null=True, blank=True)
    reset_code_expires_at = models.DateTimeField(null=True, blank=True)
    onesignal_player_id = models.CharField(max_length=255, null=True, blank=True)
    can_challenge_with_pdf = models.BooleanField(default=False)

    def __str__(self):
        return self.email


class FeatureRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("approved", "Approuvé"),
        ("refused", "Refusé"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feature_requests",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"FeatureRequest({self.user.email}, {self.status})"


class UserStats(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stats'
    )
    total_quizzes = models.IntegerField(default=0)
    total_score = models.FloatField(default=0.0)   # somme des scores (%)
    current_streak = models.IntegerField(default=0)  # jours consécutifs
    last_activity = models.DateField(null=True, blank=True)
    badges = models.JSONField(default=list)  # liste des badges débloqués
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)

    def get_avg_score(self):
        if self.total_quizzes == 0:
            return 0
        return round(self.total_score / self.total_quizzes, 1)

    def __str__(self):
        return f"Stats de {self.user}"