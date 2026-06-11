from django.conf import settings
from django.db import models
from documents.models import Document


class SpacedRepetition(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='srs_entries'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='srs_entries'
    )
    next_review = models.DateField(db_index=True)
    interval_days = models.IntegerField(default=1)
    ease_factor = models.FloatField(default=2.5)
    repetitions = models.IntegerField(default=0)
    last_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'document')

    def __str__(self):
        return f"SRS {self.user} - {self.document.id} (next: {self.next_review})"
