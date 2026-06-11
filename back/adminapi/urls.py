from django.urls import path
from . import views

urlpatterns = [
    # Dashboard KPIs
    path("stats/",                              views.AdminStatsView.as_view(),                  name="admin-stats"),

    # Utilisateurs
    path("users/",                              views.AdminUsersView.as_view(),                  name="admin-users"),
    path("users/<int:pk>/",                     views.AdminUserDetailView.as_view(),             name="admin-user-detail"),

    # Documents
    path("documents/",                          views.AdminDocumentsView.as_view(),              name="admin-documents"),
    path("documents/<int:pk>/",                 views.AdminDocumentDetailView.as_view(),         name="admin-document-detail"),

    # Quiz & Résultats
    path("results/",                            views.AdminResultsView.as_view(),                name="admin-results"),

    # Résumés
    path("summaries/",                          views.AdminSummariesView.as_view(),              name="admin-summaries"),

    # Culture générale (CRUD)
    path("culture-questions/",                  views.AdminCultureQuestionsView.as_view(),       name="admin-culture-questions"),
    path("culture-questions/<int:pk>/",         views.AdminCultureQuestionDetailView.as_view(),  name="admin-culture-question-detail"),

    # Amis & demandes
    path("friend-requests/",                    views.AdminFriendRequestsView.as_view(),         name="admin-friend-requests"),

    # SRS
    path("srs-cards/",                          views.AdminSRSCardsView.as_view(),               name="admin-srs-cards"),

    # Sons du jeu
    path("game-sounds/",                        views.AdminGameSoundsView.as_view(),             name="admin-game-sounds"),
    path("game-sounds/<str:key>/",              views.AdminGameSoundDetailView.as_view(),        name="admin-game-sound-detail"),

    # Paramètres du jeu
    path("game-settings/",                      views.AdminGameSettingsView.as_view(),           name="admin-game-settings"),
]
