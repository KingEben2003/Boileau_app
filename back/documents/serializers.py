from pathlib import Path

from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "file_url",
            "extracted_text",
            "upload_date",
        ]
        read_only_fields = ["id", "title", "file_url", "extracted_text", "upload_date"]

    def get_file_url(self, obj):
        if not obj.file:
            return None

        request = self.context.get("request")
        if request is None:
            return obj.file.url

        return request.build_absolute_uri(obj.file.url)

    def get_title(self, obj):
        if obj.title:
            return obj.title
        if not obj.file:
            return ""
        import re
        stem = Path(obj.file.name).stem
        # Retire le suffixe aléatoire Django (_XXXXXXX en fin de nom)
        return re.sub(r'_[A-Za-z0-9]{7}$', '', stem) or stem
