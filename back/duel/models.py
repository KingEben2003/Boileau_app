import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

TICKET_TTL_SECONDS = 30


class WSTicket(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ws_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        db_table = "duel_wsticket"

    def is_valid(self):
        if self.used:
            return False
        return timezone.now() <= self.created_at + timedelta(seconds=TICKET_TTL_SECONDS)
