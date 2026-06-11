from django.urls import path

from .views import (
    AnalyticsSummaryView,
    AnalyticsProgressionView,
    AnalyzeWeaknessesView,
    AnalyticsDashboardView,
    DailyChallengesView,
)

urlpatterns = [
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path("analytics/progression/", AnalyticsProgressionView.as_view(), name="analytics-progression"),
    path("analytics/dashboard/", AnalyticsDashboardView.as_view(), name="analytics-dashboard"),
    path("analytics/daily-challenges/", DailyChallengesView.as_view(), name="analytics-daily-challenges"),
    path("ai/weaknesses/", AnalyzeWeaknessesView.as_view(), name="ai-weaknesses"),
]
