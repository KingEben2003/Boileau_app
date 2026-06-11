from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WSTicket


class WSTicketView(APIView):
    """Issue a short-lived WebSocket ticket (30 s TTL, single-use) for the current user."""

    def post(self, request):
        ticket = WSTicket.objects.create(user=request.user)
        return Response({"ticket": str(ticket.id)}, status=status.HTTP_201_CREATED)
