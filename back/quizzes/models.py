from django.db import models
from documents.models import Document
from django.conf import settings

class Quiz(models.Model):

    QUIZ_TYPES = [
        ('qcm', 'QCM'),
        ('true_false', 'True/False'),
        ('mixed', 'Mixte'),
    ]

    DIFFICULTY_LEVELS = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='quizzes'
    )

    type = models.CharField(max_length=20, choices=QUIZ_TYPES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_LEVELS)
    number_of_questions = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quiz {self.id} - {self.document.id}"
    

class Question(models.Model):

    QUESTION_TYPES = [
        ('qcm', 'QCM'),
        ('true_false', 'True/False'),
    ]

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions'
    )

    question_text = models.TextField()
    options = models.JSONField(blank=True, null=True)
    correct_answer = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=QUESTION_TYPES)

    def __str__(self):
        return self.question_text[:50]
    

class Result(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='results'
    )

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='results'
    )

    score = models.FloatField()
    date_passed = models.DateTimeField(auto_now_add=True, db_index=True)
    time_spent_seconds = models.IntegerField(null=True, blank=True)
    answers_detail = models.JSONField(null=True, blank=True)
    mastery_after = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.id} ({self.score})"