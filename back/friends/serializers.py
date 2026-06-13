from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Challenge, FriendRequest, Notification

User = get_user_model()


class FriendUserSerializer(serializers.ModelSerializer):
    level = serializers.SerializerMethodField()
    score = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "level", "score"]

    def get_level(self, obj):
        try:
            return obj.stats.level
        except Exception:
            return 1

    def get_score(self, obj):
        try:
            return obj.stats.get_avg_score()
        except Exception:
            return 0


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = FriendUserSerializer(read_only=True)
    to_user = FriendUserSerializer(read_only=True)
    sent_at = serializers.SerializerMethodField()

    class Meta:
        model = FriendRequest
        fields = ["id", "from_user", "to_user", "status", "created_at", "sent_at"]

    def get_sent_at(self, obj):
        from datetime import timedelta
        from django.utils import timezone

        delta = timezone.now() - obj.created_at
        if delta < timedelta(minutes=1):
            return "À l'instant"
        if delta < timedelta(hours=1):
            mins = int(delta.total_seconds() / 60)
            return f"Il y a {mins} min"
        if delta < timedelta(days=1):
            hrs = int(delta.total_seconds() / 3600)
            return f"Il y a {hrs}h"
        days = delta.days
        return f"Il y a {days} jour{'s' if days > 1 else ''}"


class QuizMiniSerializer(serializers.Serializer):
    """Sérialiseur léger pour le quiz lié au défi (sans les questions)."""
    id = serializers.IntegerField()
    type = serializers.CharField()
    difficulty = serializers.CharField()
    number_of_questions = serializers.IntegerField()
    document_title = serializers.SerializerMethodField()

    def get_document_title(self, obj):
        try:
            return obj.document.title or obj.document.file.name
        except Exception:
            return ""


class ChallengeSerializer(serializers.ModelSerializer):
    challenger = FriendUserSerializer(read_only=True)
    opponent = FriendUserSerializer(read_only=True)
    winner = FriendUserSerializer(read_only=True)
    quiz = QuizMiniSerializer(read_only=True)

    class Meta:
        model = Challenge
        fields = [
            "id", "challenger", "opponent", "quiz", "status",
            "challenger_score", "opponent_score",
            "challenger_answers", "opponent_answers",
            "winner", "created_at", "updated_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "challenge_id", "message", "is_read", "created_at"]
