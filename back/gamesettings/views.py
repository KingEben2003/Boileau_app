from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GameSettings
from .serializers import GameSettingsSerializer


class PublicGameSettingsView(APIView):
    """GET /api/game-settings/ — réglages publics du jeu (countdown + défauts MP).

    Public : le front préremplit le compte à rebours et les valeurs par défaut
    des défis multijoueurs.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(GameSettingsSerializer(GameSettings.load()).data)
