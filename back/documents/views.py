"""documents/views.py
~~~~~~~~~~~~~~~~~~
Vue API REST pour la gestion des documents PDF.

Endpoints (via le routeur DRF) :
  GET  /api/documents/     → liste les PDFs de l'utilisateur.
  POST /api/documents/     → upload un nouveau PDF (multipart/form-data).

À l'upload, le modèle Document extrait automatiquement le texte du PDF
via documents/services.py (hook dans Document.save()).
"""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Document
from .serializers import DocumentSerializer
from .services import extract_and_clean_pdf_text


class DocumentViewSet(viewsets.ModelViewSet):
    """CRUD pour les documents PDF.

    Seules les méthodes GET et POST sont autorisées (pas de PUT/DELETE).
    Chaque document est lié à un utilisateur.
    """

    serializer_class = DocumentSerializer
    # Accepte les uploads de fichiers (multipart) et les formulaires classiques
    parser_classes = (MultiPartParser, FormParser)
    # On autorise la lecture, création et suppression
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        """Filtre les documents par utilisateur, triés du plus récent au plus ancien."""
        user = self._resolve_user()
        return Document.objects.filter(user=user).order_by("-upload_date")

    def create(self, request, *args, **kwargs):
        """Override pour valider le fichier (présence, type PDF, taille) avant création."""
        file = request.FILES.get("file")

        if not file:
            return Response(
                {"detail": "Aucun fichier fourni. Envoyez un PDF dans le champ 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Le fichier dépasse la limite de 5 Mo. Réduisez la taille du PDF avant de l'envoyer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not self._is_pdf(file):
            return Response(
                {"detail": "Seuls les fichiers PDF sont acceptés."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().create(request, *args, **kwargs)

    @staticmethod
    def _is_pdf(file) -> bool:
        """Valide qu'un fichier uploadé est bien un PDF (extension/MIME + signature %PDF)."""
        name = (getattr(file, "name", "") or "").lower()
        content_type = (getattr(file, "content_type", "") or "").lower()
        if not name.endswith(".pdf") and content_type != "application/pdf":
            return False
        # Vérifie la signature binaire « %PDF » en début de fichier
        try:
            file.seek(0)
            header = file.read(5)
            file.seek(0)
        except Exception:
            return True  # en-tête illisible : on se fie à l'extension / au MIME
        return header.startswith(b"%PDF")

    def perform_create(self, serializer):
        """Associe le document à l'utilisateur et enregistre le titre original."""
        user = self._resolve_user()
        file = self.request.FILES.get("file")
        title = ""
        if file and hasattr(file, "name"):
            from pathlib import Path as _Path
            title = _Path(file.name).stem  # sans extension
        serializer.save(user=user, title=title)

    @action(detail=True, methods=["post"], url_path="reextract")
    def reextract(self, request, pk=None):
        """Re-déclenche l'extraction du texte pour un document existant.

        Utile quand l'extraction initiale a échoué (PDF image, erreur réseau…).
        POST /api/documents/<id>/reextract/
        """
        user = self._resolve_user()
        document = get_object_or_404(Document, pk=pk, user=user)

        if not document.file:
            return Response(
                {"detail": "Aucun fichier associé à ce document."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extracted = extract_and_clean_pdf_text(document.file.path)

        if not extracted:
            return Response(
                {
                    "detail": (
                        "Impossible d'extraire le texte de ce PDF. "
                        "Il s'agit probablement d'un PDF basé sur des images (scan). "
                        "Utilisez un PDF avec du texte natif (non scanné)."
                    ),
                    "extracted_text": "",
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        Document.objects.filter(pk=document.pk).update(extracted_text=extracted)
        document.extracted_text = extracted
        return Response(DocumentSerializer(document, context={"request": request}).data)

    def _resolve_user(self):
        """Renvoie l'utilisateur authentifié.

        L'accès est protégé globalement par IsAuthenticated
        (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]), donc request.user
        est toujours un utilisateur authentifié à ce stade.
        """
        return self.request.user
