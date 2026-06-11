from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Challenge, FriendRequest

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
        from django.utils import timezone
        from datetime import timedelta

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


class ChallengeSerializer(serializers.ModelSerializer):
    challenger = FriendUserSerializer(read_only=True)
    opponent = FriendUserSerializer(read_only=True)
    winner = FriendUserSerializer(read_only=True)

    class Meta:
        model = Challenge
        fields = [
            "id", "challenger", "opponent", "rounds", "themes",
            "timer_seconds", "status", "created_at",
            "num_questions", "types", "difficulty", "end_condition",
            "challenger_score", "opponent_score", "winner",
        ]
