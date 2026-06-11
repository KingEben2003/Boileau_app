from rest_framework import serializers

from .models import GameSettings


class GameSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameSettings
        fields = [
            "countdown_seconds",
            "mp_num_questions",
            "mp_themes",
            "mp_types",
            "mp_difficulty",
            "mp_end_condition",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
