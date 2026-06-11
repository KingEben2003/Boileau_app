import datetime
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import Document
from .models import SpacedRepetition


def sm2_update(sr: SpacedRepetition, score_percent: float) -> SpacedRepetition:
    """Applique l'algorithme SM-2 basé sur le score (0-100)."""
    # Convertir le score en qualité SM-2 (0-5)
    if score_percent >= 90:
        quality = 5
    elif score_percent >= 75:
        quality = 4
    elif score_percent >= 60:
        quality = 3
    elif score_percent >= 40:
        quality = 2
    else:
        quality = 1

    if quality >= 3:
        if sr.repetitions == 0:
            sr.interval_days = 1
        elif sr.repetitions == 1:
            sr.interval_days = 6
        else:
            sr.interval_days = round(sr.interval_days * sr.ease_factor)
        sr.repetitions += 1
    else:
        sr.repetitions = 0
        sr.interval_days = 1

    sr.ease_factor = max(1.3, sr.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    sr.next_review = datetime.date.today() + datetime.timedelta(days=sr.interval_days)
    return sr


class SRSDueView(APIView):
    """GET /api/srs/due/ — retourne les documents à réviser aujourd'hui."""

    def get(self, request):
        user = self._resolve_user()
        today = datetime.date.today()
        due = SpacedRepetition.objects.filter(
            user=user, next_review__lte=today
        ).select_related('document').order_by('next_review')

        data = []
        for sr in due:
            data.append({
                'id': sr.id,
                'document_id': sr.document.id,
                'document_title': sr.document.file.name.split('/')[-1],
                'next_review': sr.next_review.isoformat(),
                'interval_days': sr.interval_days,
                'repetitions': sr.repetitions,
                'ease_factor': round(sr.ease_factor, 2),
                'last_score': sr.last_score,
                'overdue_days': (today - sr.next_review).days,
            })

        return Response({'due_count': len(data), 'items': data})

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user


class SRSUpdateView(APIView):
    """POST /api/srs/update/ — met à jour après révision d'un document.
    Body: { document_id: int, score: float }
    """

    def post(self, request):
        user = self._resolve_user()
        document_id = request.data.get('document_id')
        score = request.data.get('score')

        if not document_id or score is None:
            return Response({'detail': 'document_id et score requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            score = float(score)
        except (TypeError, ValueError):
            return Response({'detail': 'score doit être un nombre.'}, status=status.HTTP_400_BAD_REQUEST)

        document = get_object_or_404(Document, id=document_id, user=user)

        sr, created = SpacedRepetition.objects.get_or_create(
            user=user,
            document=document,
            defaults={'next_review': datetime.date.today()}
        )
        sr.last_score = score
        sr = sm2_update(sr, score)
        sr.save()

        return Response({
            'document_id': document.id,
            'next_review': sr.next_review.isoformat(),
            'interval_days': sr.interval_days,
            'ease_factor': round(sr.ease_factor, 2),
            'repetitions': sr.repetitions,
        })

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user


class SRSAllView(APIView):
    """GET /api/srs/ — retourne toutes les entrées SRS de l'utilisateur."""

    def get(self, request):
        user = self._resolve_user()
        today = datetime.date.today()
        entries = SpacedRepetition.objects.filter(user=user).select_related('document').order_by('next_review')

        data = []
        for sr in entries:
            data.append({
                'id': sr.id,
                'document_id': sr.document.id,
                'document_title': sr.document.file.name.split('/')[-1],
                'next_review': sr.next_review.isoformat(),
                'interval_days': sr.interval_days,
                'repetitions': sr.repetitions,
                'ease_factor': round(sr.ease_factor, 2),
                'last_score': sr.last_score,
                'is_due': sr.next_review <= today,
            })

        return Response({'total': len(data), 'items': data})

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user
