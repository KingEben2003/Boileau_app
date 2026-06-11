"""
summaries/views.py
~~~~~~~~~~~~~~~~~~
Vue API REST pour la génération de résumés.

Endpoints : 
  POST /api/summaries/generate/
    - Reçoit un document_id et un type (brief / detailed).
    - Appelle le service Gemini pour produire le résumé.
    - Sauvegarde le résumé en base et le renvoie au frontend.
  
  GET /api/summaries/?document_id=X
    - Récupère tous les résumés d'un document.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import Document

from .models import Summary
from .serializers import SummaryGenerateSerializer, SummarySerializer
from .services import GeminiServiceError, generate_summary_with_gemini


class SummaryListAPIView(APIView):
    """Vue pour lister les résumés d'un document."""

    def get(self, request):
        # Récupère le document_id des query params
        document_id = request.query_params.get("document_id")
        
        if not document_id:
            return Response(
                {"detail": "Le paramètre document_id est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Résolution utilisateur
        user = self._resolve_user()
        
        # Vérifie que le document appartient à l'utilisateur
        document = get_object_or_404(Document, id=document_id, user=user)
        
        # Récupère tous les résumés du document
        summaries = Summary.objects.filter(document=document).order_by("-created_at")
        
        return Response(
            SummarySerializer(summaries, many=True).data,
            status=status.HTTP_200_OK,
        )

    def _resolve_user(self):
        """Renvoie l'utilisateur authentifié.

        L'accès est protégé globalement par IsAuthenticated
        (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]), donc request.user
        est toujours un utilisateur authentifié à ce stade.
        """
        return self.request.user


class GenerateSummaryAPIView(APIView):
    """Vue qui orchestre la génération d'un résumé via l'API Gemini.

    Le résultat est renvoyé sous forme de JsonResponse structurée
    contenant les clés du SummarySerializer (id, document, type, content, created_at).
    """

    def post(self, request):
        # 1) Validation des données d'entrée (document_id, type)
        serializer = SummaryGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2) Résolution de l'utilisateur (authentifié ou démo)
        user = self._resolve_user()

        # 3) Récupération du document (vérifie qu'il appartient à l'utilisateur)
        document = get_object_or_404(
            Document,
            id=serializer.validated_data["document_id"],
            user=user,
        )

        # 4) Vérification que le PDF a bien du texte extrait
        if not document.extracted_text:
            return Response(
                {
                    "detail": (
                        "Ce PDF ne contient pas de texte extractible (probablement un scan ou une image). "
                        "Appelez POST /api/documents/{id}/reextract/ pour retenter, "
                        "ou utilisez un PDF avec du texte natif."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        summary_type = serializer.validated_data["type"]

        # 5) Cache : si un résumé de ce type existe déjà, le renvoyer directement
        cached = Summary.objects.filter(document=document, type=summary_type).order_by("-created_at").first()
        if cached:
            return Response(SummarySerializer(cached).data, status=status.HTTP_200_OK)

        # 6) Appel au service Gemini pour générer le résumé
        try:
            summary_text = generate_summary_with_gemini(
                document.extracted_text, summary_type
            )
        except GeminiServiceError as exc:
            # En cas d'erreur Gemini, on renvoie le détail au frontend
            response_status = exc.status_code or status.HTTP_502_BAD_GATEWAY
            return Response({"detail": str(exc)}, status=response_status)

        # 6) Sauvegarde du résumé en base de données
        summary = Summary.objects.create(
            document=document,
            type=summary_type,
            content=summary_text,
        )

        # 7) Réponse JSON structurée (sérialisée via SummarySerializer)
        return Response(SummarySerializer(summary).data, status=status.HTTP_201_CREATED)

    def _resolve_user(self):
        """Renvoie l'utilisateur authentifié.

        L'accès est protégé globalement par IsAuthenticated
        (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]), donc request.user
        est toujours un utilisateur authentifié à ce stade.
        """
        return self.request.user
