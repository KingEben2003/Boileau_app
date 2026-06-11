from django.db import models


class GameSettings(models.Model):
    """Réglages globaux du jeu, modifiables uniquement par l'admin (singleton).

    Toujours chargé via ``GameSettings.load()`` (une seule ligne, pk=1).
    """

    END_CONDITIONS = [
        ("best_score", "Répondre à toutes les questions — meilleur score"),
        ("elimination", "Élimination à la première mauvaise réponse seul"),
    ]

    # Compte à rebours (en secondes) par question pour les jeux Défi & Culture.
    countdown_seconds = models.PositiveIntegerField(default=30)

    # Valeurs par défaut des défis multijoueurs (le demandeur peut les ajuster).
    mp_num_questions = models.PositiveIntegerField(default=10)
    mp_themes = models.JSONField(default=list, blank=True)
    mp_types = models.JSONField(default=list, blank=True)   # ex: ["qcm", "true_false"]
    mp_difficulty = models.CharField(max_length=10, default="medium")
    mp_end_condition = models.CharField(max_length=20, choices=END_CONDITIONS, default="best_score")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètres du jeu"
        verbose_name_plural = "Paramètres du jeu"

    def __str__(self):
        return f"Paramètres du jeu (countdown={self.countdown_seconds}s)"

    def save(self, *args, **kwargs):
        self.pk = 1  # singleton
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
