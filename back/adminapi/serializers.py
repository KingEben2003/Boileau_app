from django.contrib.auth import get_user_model
from rest_framework import serializers

from culture.models import CultureQuestion
from documents.models import Document
from friends.models import FriendRequest
from quizzes.models import Result
from srs.models import SpacedRepetition
from summaries.models import Summary

User = get_user_model()


# ── Utilisateurs ─────────────────────────────────────────────────────────────
class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "date_joined", "is_active", "is_staff", "is_superuser",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "is_superuser", "username", "email"]


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour partielle (is_active / is_staff uniquement)."""
    class Meta:
        model = User
        fields = ["is_active", "is_staff"]


# ── Documents ─────────────────────────────────────────────────────────────────
class AdminDocumentSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="upload_date", read_only=True)

    class Meta:
        model = Document
        fields = ["id", "title", "user", "created_at"]

    def get_user(self, obj):
        return {"id": obj.user.id, "username": obj.user.username, "email": obj.user.email}


# ── Résultats quiz ─────────────────────────────────────────────────────────────
class AdminResultSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    document_title = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = ["id", "user", "document_title", "score", "time_spent_seconds", "date_passed"]

    def get_user(self, obj):
        return {"id": obj.user.id, "username": obj.user.username, "email": obj.user.email}

    def get_document_title(self, obj):
        try:
            return obj.quiz.document.title or f"Document {obj.quiz.document.id}"
        except Exception:
            return None


# ── Résumés ───────────────────────────────────────────────────────────────────
class AdminSummarySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    document_title = serializers.SerializerMethodField()
    level = serializers.CharField(source="type", read_only=True)

    class Meta:
        model = Summary
        fields = ["id", "user", "document_title", "level", "created_at"]

    def get_user(self, obj):
        return {"id": obj.document.user.id, "username": obj.document.user.username, "email": obj.document.user.email}

    def get_document_title(self, obj):
        return obj.document.title or f"Document {obj.document.id}"


# ── Culture ────────────────────────────────────────────────────────────────────
class AdminCultureQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CultureQuestion
        fields = ["id", "theme", "question", "options", "correct_answer", "explanation", "type", "difficulty"]

    def validate_options(self, value):
        if not isinstance(value, list) or len(value) < 2:
            raise serializers.ValidationError("Au moins 2 options sont nécessaires.")
        return value

    def validate(self, data):
        options = data.get("options", getattr(self.instance, "options", []))
        correct = data.get("correct_answer", getattr(self.instance, "correct_answer", 0))
        if correct < 0 or correct >= len(options):
            raise serializers.ValidationError({"correct_answer": "L'index dépasse le nombre d'options."})
        return data


# ── Amis ───────────────────────────────────────────────────────────────────────
class AdminFriendRequestSerializer(serializers.ModelSerializer):
    from_user = serializers.SerializerMethodField()
    to_user = serializers.SerializerMethodField()
    sent_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = FriendRequest
        fields = ["id", "from_user", "to_user", "status", "sent_at"]

    def get_from_user(self, obj):
        return {"id": obj.from_user.id, "username": obj.from_user.username}

    def get_to_user(self, obj):
        return {"id": obj.to_user.id, "username": obj.to_user.username}


# ── SRS ────────────────────────────────────────────────────────────────────────
class AdminSRSSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    document_title = serializers.SerializerMethodField()
    interval = serializers.IntegerField(source="interval_days", read_only=True)
    easiness_factor = serializers.FloatField(source="ease_factor", read_only=True)

    class Meta:
        model = SpacedRepetition
        fields = ["id", "user", "document_title", "next_review", "interval", "repetitions", "easiness_factor"]

    def get_user(self, obj):
        return {"id": obj.user.id, "username": obj.user.username, "email": obj.user.email}

    def get_document_title(self, obj):
        return obj.document.title or f"Document {obj.document.id}"
