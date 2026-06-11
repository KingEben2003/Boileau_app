from django.contrib import admin

from .models import Summary


@admin.register(Summary)
class SummaryAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "type", "created_at", "content_preview")
    list_filter = ("type", "created_at")
    search_fields = ("document__file", "document__user__username", "document__user__email", "content")
    autocomplete_fields = ("document",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    @admin.display(description="Apercu")
    def content_preview(self, obj):
        return obj.content[:80]
