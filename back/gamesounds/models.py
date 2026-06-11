from django.db import models


class GameSound(models.Model):
    """Un effet sonore / musique du jeu, géré depuis la console admin.

    Une seule entrée par catégorie (``key`` unique). Le fichier audio est
    téléversé par un administrateur et servi aux joueurs via l'endpoint public
    ``GET /api/game-sounds/``.
    """

    BACKGROUND_MUSIC = "background_music"
    CORRECT = "correct"
    WRONG = "wrong"
    WIN = "win"
    LOSE = "lose"

    KEY_CHOICES = [
        (BACKGROUND_MUSIC, "Musique de fond"),
        (CORRECT, "Bonne réponse"),
        (WRONG, "Mauvaise réponse"),
        (WIN, "Victoire"),
        (LOSE, "Défaite"),
    ]

    key = models.CharField(max_length=32, choices=KEY_CHOICES, unique=True)
    audio = models.FileField(upload_to="game_sounds/")
    label = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_key_display()} ({'actif' if self.is_active else 'inactif'})"
