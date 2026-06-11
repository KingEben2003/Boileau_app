from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GameSound


class PublicGameSoundsView(APIView):
    """GET /api/game-sounds/ — sons actifs du jeu, consommés par le front joueur.

    Renvoie un dictionnaire { <catégorie>: url|null } pour les 5 catégories.
    Public : le jeu peut précharger les sons sans authentification.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        active = {
            gs.key: gs.audio
            for gs in GameSound.objects.filter(is_active=True)
            if gs.audio
        }
        data = {}
        for key, _label in GameSound.KEY_CHOICES:
            audio = active.get(key)
            data[key] = request.build_absolute_uri(audio.url) if audio else None
        return Response(data)
