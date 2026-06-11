from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "file_name", "user", "upload_date", "has_extracted_text")
    list_filter = ("upload_date", "user")
    search_fields = ("file", "user__username", "user__email")
    autocomplete_fields = ("user",)
    ordering = ("-upload_date",)
    date_hierarchy = "upload_date"

    @admin.display(description="Nom du fichier")
    def file_name(self, obj):
        return obj.file.name

    @admin.display(boolean=True, description="Texte extrait")
    def has_extracted_text(self, obj):
        return bool(obj.extracted_text)
