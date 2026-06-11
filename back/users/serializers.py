from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    current_streak = serializers.SerializerMethodField()
    total_quizzes = serializers.SerializerMethodField()
    avg_score = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "date_joined",
            "is_staff", "is_superuser",
            "xp", "level", "current_streak", "total_quizzes", "avg_score", "badges",
        ]
        read_only_fields = ["id", "date_joined", "is_staff", "is_superuser"]

    def _stats(self, obj):
        try:
            return obj.stats
        except Exception:
            return None

    def get_xp(self, obj):
        s = self._stats(obj)
        return s.xp if s else 0

    def get_level(self, obj):
        s = self._stats(obj)
        return s.level if s else 1

    def get_current_streak(self, obj):
        s = self._stats(obj)
        return s.current_streak if s else 0

    def get_total_quizzes(self, obj):
        s = self._stats(obj)
        return s.total_quizzes if s else 0

    def get_avg_score(self, obj):
        s = self._stats(obj)
        return s.get_avg_score() if s else 0

    def get_badges(self, obj):
        s = self._stats(obj)
        return s.badges if s else []


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        return user
