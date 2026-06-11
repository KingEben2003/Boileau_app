from django.urls import path

from .views import GenerateQuizAPIView, QuizListAPIView, SubmitQuizResultAPIView

urlpatterns = [
    path("quizzes/", QuizListAPIView.as_view(), name="quiz-list"),
    path("quizzes/<int:pk>/", QuizListAPIView.as_view(), name="quiz-detail"),
    path("quizzes/generate/", GenerateQuizAPIView.as_view(), name="quiz-generate"),
    path("quizzes/<int:pk>/submit/", SubmitQuizResultAPIView.as_view(), name="quiz-submit"),
]

