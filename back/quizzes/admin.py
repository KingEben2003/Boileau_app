from django.contrib import admin

from .models import Question, Quiz, Result


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ("question_text", "type", "correct_answer")
    show_change_link = True


class ResultInline(admin.TabularInline):
    model = Result
    extra = 0
    fields = ("user", "score", "date_passed")
    readonly_fields = ("date_passed",)
    autocomplete_fields = ("user",)
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "type", "difficulty", "number_of_questions", "created_at")
    list_filter = ("type", "difficulty", "created_at")
    search_fields = ("document__file", "document__user__username", "document__user__email")
    autocomplete_fields = ("document",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    inlines = (QuestionInline, ResultInline)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "quiz", "type", "short_question", "correct_answer")
    list_filter = ("type",)
    search_fields = ("question_text", "correct_answer", "quiz__id")
    autocomplete_fields = ("quiz",)
    ordering = ("id",)

    @admin.display(description="Question")
    def short_question(self, obj):
        return obj.question_text[:80]


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "quiz", "score", "date_passed")
    list_filter = ("date_passed", "quiz__type", "quiz__difficulty")
    search_fields = ("user__username", "user__email", "quiz__id")
    autocomplete_fields = ("user", "quiz")
    ordering = ("-date_passed",)
    date_hierarchy = "date_passed"
