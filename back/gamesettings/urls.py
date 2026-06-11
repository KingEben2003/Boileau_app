from django.urls import path

from .views import PublicGameSettingsView

urlpatterns = [
    path("game-settings/", PublicGameSettingsView.as_view(), name="public-game-settings"),
]
