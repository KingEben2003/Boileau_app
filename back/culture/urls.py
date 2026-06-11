from django.urls import path

from .views import (
    CultureLeaderboardView,
    CultureQuestionsView,
    CultureSubmitView,
    CultureThemesView,
    GameQuestionsView,
)

urlpatterns = [
    path("game/questions/", GameQuestionsView.as_view(), name="game-questions"),
    path("culture/themes/", CultureThemesView.as_view(), name="culture-themes"),
    path("culture/questions/", CultureQuestionsView.as_view(), name="culture-questions"),
    path("culture/submit/", CultureSubmitView.as_view(), name="culture-submit"),
    path("culture/leaderboard/", CultureLeaderboardView.as_view(), name="culture-leaderboard"),
]
