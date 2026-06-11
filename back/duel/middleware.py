"""Authentification pour les connexions WebSocket.

Priorité :
  1. Ticket court-vécu (``?ticket=<uuid>``) — émis par /api/ws-ticket/, valable 30 s, usage unique.
  2. Token JWT en query-string (``?token=<access>``) — conservé pour la rétro-compatibilité.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _get_user(user_id):
    User = get_user_model()
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


@database_sync_to_async
def _get_user_from_ticket(ticket_id):
    from .models import WSTicket
    try:
        ticket = WSTicket.objects.select_related("user").get(id=ticket_id)
    except Exception:
        return None
    if not ticket.is_valid():
        return None
    ticket.used = True
    ticket.save(update_fields=["used"])
    return ticket.user


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query = parse_qs((scope.get("query_string") or b"").decode())
        scope["user"] = AnonymousUser()

        ticket_id = (query.get("ticket") or [None])[0]
        if ticket_id:
            user = await _get_user_from_ticket(ticket_id)
            if user is not None:
                scope["user"] = user
                return await self.app(scope, receive, send)

        token = (query.get("token") or [None])[0]
        if token:
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                access = AccessToken(token)
                scope["user"] = await _get_user(access["user_id"])
            except Exception:
                scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)
