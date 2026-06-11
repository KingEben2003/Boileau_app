from django.urls import path

from .views import GenerateSummaryAPIView, SummaryListAPIView

urlpatterns = [
    path("summaries/", SummaryListAPIView.as_view(), name="summary-list"),
    path("summaries/generate/", GenerateSummaryAPIView.as_view(), name="summary-generate"),
]
