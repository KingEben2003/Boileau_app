from rest_framework import serializers

from .models import Quiz, Question


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "question_text", "options", "correct_answer", "type"]
        read_only_fields = ["id"]


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "document",
            "type",
            "difficulty",
            "number_of_questions",
            "created_at",
            "questions",
        ]
        read_only_fields = ["id", "created_at", "questions"]


class QuizGenerateSerializer(serializers.Serializer):
    document_id = serializers.IntegerField()
    type = serializers.ChoiceField(choices=Quiz.QUIZ_TYPES, default="qcm")
    difficulty = serializers.ChoiceField(choices=Quiz.DIFFICULTY_LEVELS, default="medium")
    number_of_questions = serializers.IntegerField(min_value=1, max_value=30, default=5)

