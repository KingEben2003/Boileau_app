from django.urls import path

from .consumer import DuelConsumer

websocket_urlpatterns = [
    path("ws/duel/<int:challenge_id>/", DuelConsumer.as_asgi()),
]
