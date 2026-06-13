"""
Point d'entrée WSGI pour O2Switch (cPanel + Phusion Passenger).
Ce fichier est lu automatiquement par Passenger — ne pas le renommer.
"""
import os
import sys

# Ajouter le dossier back/ au path Python
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "APIBoileau.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
