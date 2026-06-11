"""
ASGI config for APIBoileau project (HTTP + WebSocket via Channels).
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'APIBoileau.settings')

# L'application HTTP Django doit être initialisée avant d'importer le code qui
# touche aux modèles (consumer/routing).
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from duel.middleware import JWTAuthMiddleware  # noqa: E402
from duel.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
