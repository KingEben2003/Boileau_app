from rest_framework import serializers

from .models import GameSound


class GameSoundSerializer(serializers.ModelSerializer):
    audio_url = serializers.SerializerMethodField()
    key_display = serializers.CharField(source="get_key_display", read_only=True)

    class Meta:
        model = GameSound
        fields = ["id", "key", "key_display", "label", "audio_url", "is_active", "updated_at"]
        read_only_fields = ["id", "key_display", "audio_url", "updated_at"]

    def get_audio_url(self, obj):
        if not obj.audio:
            return None
        request = self.context.get("request")
        if request is None:
            return obj.audio.url
        return request.build_absolute_uri(obj.audio.url)
