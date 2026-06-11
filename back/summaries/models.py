from django.db import models
from documents.models import Document

class Summary(models.Model):

    SUMMARY_TYPES = [
        ('brief', 'Brief'),
        ('medium', 'Medium'),
        ('detailed', 'Detailed'),
    ]

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='summaries'
    )

    type = models.CharField(max_length=20, choices=SUMMARY_TYPES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Summary ({self.type}) - {self.document.id}"