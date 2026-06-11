from rest_framework import serializers

from .models import Summary


class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = ["id", "document", "type", "content", "created_at"]
        read_only_fields = ["id", "created_at", "content"]


class SummaryGenerateSerializer(serializers.Serializer):
    document_id = serializers.IntegerField()
    type = serializers.ChoiceField(choices=Summary.SUMMARY_TYPES, default="brief")
