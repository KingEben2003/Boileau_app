from django.contrib import admin

from .models import GameSound


@admin.register(GameSound)
class GameSoundAdmin(admin.ModelAdmin):
    list_display = ("key", "label", "is_active", "updated_at")
    list_filter = ("is_active",)
