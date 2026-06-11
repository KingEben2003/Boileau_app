from django.urls import path

from .views import PublicGameSoundsView

urlpatterns = [
    path("game-sounds/", PublicGameSoundsView.as_view(), name="public-game-sounds"),
]
