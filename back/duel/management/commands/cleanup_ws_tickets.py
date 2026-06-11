from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from duel.models import TICKET_TTL_SECONDS, WSTicket


class Command(BaseCommand):
    help = "Supprime les tickets WebSocket expirés ou déjà utilisés."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(seconds=TICKET_TTL_SECONDS)
        deleted, _ = WSTicket.objects.filter(
            created_at__lt=cutoff
        ).delete()
        self.stdout.write(f"{deleted} ticket(s) supprimé(s).")
