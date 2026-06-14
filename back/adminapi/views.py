"""
adminapi/views.py
-----------------
Toutes les vues de la console d'administration React.
Protégées par IsAdminUser (is_staff=True ou is_superuser=True).
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from culture.models import CultureQuestion
from documents.models import Document
from friends.models import FriendRequest, Notification as UserNotification
from users.models import FeatureRequest
from gamesounds.models import GameSound
from gamesounds.serializers import GameSoundSerializer
from gamesounds.validators import audio_validation_error
from gamesettings.models import GameSettings
from gamesettings.serializers import GameSettingsSerializer
from quizzes.models import Result
from srs.models import SpacedRepetition
from summaries.models import Summary

from .serializers import (
    AdminCultureQuestionSerializer,
    AdminDocumentSerializer,
    AdminFriendRequestSerializer,
    AdminResultSerializer,
    AdminSRSSerializer,
    AdminSummarySerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
)

User = get_user_model()


# ── Helpers ───────────────────────────────────────────────────────────────────
def _paginate(request, qs, serializer_class):
    """Renvoie un tableau brut (pas de pagination serveur — le front filtre côté client)."""
    return Response(serializer_class(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/admin/stats/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = date.today()
        seven_days_ago = today - timedelta(days=6)  # J-6 → inclut aujourd'hui = 7 jours

        # ── KPIs instantanés ──────────────────────────────────────────────────
        users_total = User.objects.count()
        users_today = User.objects.filter(date_joined__date=today).count()

        active_users_7d = (
            User.objects.filter(results__date_passed__date__gte=seven_days_ago)
            .distinct()
            .count()
        )

        quizzes_today = Result.objects.filter(date_passed__date=today).count()
        quizzes_total = Result.objects.count()
        documents_total = Document.objects.count()
        summaries_total = Summary.objects.count()

        avg_today = (
            Result.objects.filter(date_passed__date=today)
            .aggregate(avg=Avg("score"))["avg"] or 0
        )

        # ── Séries temporelles sur 7 jours (pour les graphes) ─────────────────
        def _series(qs, date_field, days=7):
            """Renvoie [{date: "YYYY-MM-DD", count: N}] pour les N derniers jours."""
            start = today - timedelta(days=days - 1)
            raw = (
                qs.filter(**{f"{date_field}__date__gte": start})
                .annotate(day=TruncDate(date_field))
                .values("day")
                .annotate(count=Count("id"))
                .order_by("day")
            )
            # Construire un dict jour→count pour remplir les jours à 0
            by_day = {str(row["day"]): row["count"] for row in raw}
            return [
                {"date": str(start + timedelta(days=i)), "count": by_day.get(str(start + timedelta(days=i)), 0)}
                for i in range(days)
            ]

        signups_7d = _series(User.objects, "date_joined")
        quizzes_7d = _series(Result.objects, "date_passed")

        return Response({
            "users_total": users_total,
            "users_today": users_today,
            "active_users_7d": active_users_7d,
            "quizzes_today": quizzes_today,
            "quizzes_total": quizzes_total,
            "documents_total": documents_total,
            "summaries_total": summaries_total,
            "avg_score_today": round(avg_today, 1),
            "signups_7d": signups_7d,
            "quizzes_7d": quizzes_7d,
        })


# ═══════════════════════════════════════════════════════════════════════════════
# GET    /api/admin/users/            — liste avec recherche
# PATCH  /api/admin/users/:id/        — activer/désactiver, staff
# DELETE /api/admin/users/:id/        — supprimer
# ═══════════════════════════════════════════════════════════════════════════════
class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = User.objects.order_by("-date_joined")
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(email__icontains=search)
        return Response(AdminUserSerializer(qs, many=True).data)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if user.is_superuser:
            return Response({"detail": "Impossible de modifier un superutilisateur."}, status=status.HTTP_403_FORBIDDEN)
        ser = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(AdminUserSerializer(user).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if user.is_superuser:
            return Response({"detail": "Impossible de supprimer un superutilisateur."}, status=status.HTTP_403_FORBIDDEN)
        if user == request.user:
            return Response({"detail": "Impossible de se supprimer soi-même."}, status=status.HTTP_403_FORBIDDEN)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════════
# GET    /api/admin/documents/         — liste
# DELETE /api/admin/documents/:id/     — supprimer
# ═══════════════════════════════════════════════════════════════════════════════
class AdminDocumentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Document.objects.select_related("user").order_by("-upload_date")
        return Response(AdminDocumentSerializer(qs, many=True).data)


class AdminDocumentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({"detail": "Document introuvable."}, status=status.HTTP_404_NOT_FOUND)
        # Supprime le fichier physique si le storage le gère (signal ou FileField.delete)
        try:
            doc.file.delete(save=False)
        except Exception:
            pass
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/admin/results/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminResultsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            Result.objects
            .select_related("user", "quiz", "quiz__document")
            .order_by("-date_passed")
        )
        return Response(AdminResultSerializer(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/admin/summaries/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminSummariesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Summary.objects.select_related("document", "document__user").order_by("-created_at")
        return Response(AdminSummarySerializer(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════════════════════
# GET    /api/admin/culture-questions/       — liste (filtrable par ?theme=)
# POST   /api/admin/culture-questions/       — créer
# PATCH  /api/admin/culture-questions/:id/   — modifier
# DELETE /api/admin/culture-questions/:id/   — supprimer
# ═══════════════════════════════════════════════════════════════════════════════
class AdminCultureQuestionsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = CultureQuestion.objects.all()
        theme = request.query_params.get("theme", "").strip()
        if theme:
            qs = qs.filter(theme=theme)
        return Response(AdminCultureQuestionSerializer(qs, many=True).data)

    def post(self, request):
        ser = AdminCultureQuestionSerializer(data=request.data)
        if ser.is_valid():
            instance = ser.save()
            return Response(AdminCultureQuestionSerializer(instance).data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminCultureQuestionDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        try:
            return CultureQuestion.objects.get(pk=pk)
        except CultureQuestion.DoesNotExist:
            return None

    def patch(self, request, pk):
        q = self._get(pk)
        if not q:
            return Response({"detail": "Question introuvable."}, status=status.HTTP_404_NOT_FOUND)
        ser = AdminCultureQuestionSerializer(q, data=request.data, partial=True)
        if ser.is_valid():
            instance = ser.save()
            return Response(AdminCultureQuestionSerializer(instance).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        q = self._get(pk)
        if not q:
            return Response({"detail": "Question introuvable."}, status=status.HTTP_404_NOT_FOUND)
        q.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/admin/friend-requests/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminFriendRequestsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = FriendRequest.objects.select_related("from_user", "to_user").order_by("-created_at")
        return Response(AdminFriendRequestSerializer(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/admin/srs-cards/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminSRSCardsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = SpacedRepetition.objects.select_related("user", "document").order_by("next_review")
        return Response(AdminSRSSerializer(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════════════════════
# Sons du jeu — GET/POST /api/admin/game-sounds/ , DELETE /api/admin/game-sounds/<key>/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminGameSoundsView(APIView):
    """Liste les 5 catégories de sons et téléverse/remplace le fichier d'une catégorie."""

    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        existing = {gs.key: gs for gs in GameSound.objects.all()}
        data = []
        for key, label in GameSound.KEY_CHOICES:
            gs = existing.get(key)
            if gs:
                data.append(GameSoundSerializer(gs, context={"request": request}).data)
            else:
                # Emplacement vide (aucun son téléversé pour cette catégorie)
                data.append({
                    "id": None,
                    "key": key,
                    "key_display": label,
                    "label": label,
                    "audio_url": None,
                    "is_active": False,
                    "updated_at": None,
                })
        return Response(data)

    def post(self, request):
        key = (request.data.get("key") or "").strip()
        valid_keys = {k for k, _ in GameSound.KEY_CHOICES}
        if key not in valid_keys:
            return Response(
                {"detail": f"Catégorie invalide. Valeurs autorisées : {', '.join(sorted(valid_keys))}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        audio = request.FILES.get("audio")
        error = audio_validation_error(audio)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        is_active_raw = str(request.data.get("is_active", "true")).lower()
        is_active = is_active_raw in ("true", "1", "yes", "on")
        label = (request.data.get("label") or "").strip() or dict(GameSound.KEY_CHOICES)[key]

        gs, _created = GameSound.objects.update_or_create(
            key=key,
            defaults={"audio": audio, "label": label, "is_active": is_active},
        )
        return Response(
            GameSoundSerializer(gs, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminGameSoundDetailView(APIView):
    """Supprime le son d'une catégorie (DELETE /api/admin/game-sounds/<key>/)."""

    permission_classes = [IsAdminUser]

    def delete(self, request, key):
        gs = GameSound.objects.filter(key=key).first()
        if not gs:
            return Response({"detail": "Son introuvable."}, status=status.HTTP_404_NOT_FOUND)
        gs.audio.delete(save=False)
        gs.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════════
# Paramètres du jeu — GET/PUT /api/admin/game-settings/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminGameSettingsView(APIView):
    """Lecture et mise à jour des réglages globaux du jeu (singleton)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(GameSettingsSerializer(GameSettings.load()).data)

    def put(self, request):
        ser = GameSettingsSerializer(GameSettings.load(), data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# ═══════════════════════════════════════════════════════════════════════════════
# Demandes d'activation — GET /api/admin/feature-requests/
#                         POST /api/admin/feature-requests/:id/handle/
# ═══════════════════════════════════════════════════════════════════════════════
class AdminFeatureRequestsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = FeatureRequest.objects.select_related("user").order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = [
            {
                "id": r.id,
                "user": {"id": r.user.id, "email": r.user.email, "username": r.user.username,
                         "full_name": r.user.get_full_name()},
                "status": r.status,
                "admin_reason": r.admin_reason,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in qs
        ]
        return Response(data)


class AdminFeatureRequestHandleView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            req = FeatureRequest.objects.select_related("user").get(pk=pk)
        except FeatureRequest.DoesNotExist:
            return Response({"detail": "Demande introuvable."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")  # "approve" ou "refuse"
        reason = request.data.get("reason", "").strip()

        if action not in ("approve", "refuse"):
            return Response({"detail": "action doit être 'approve' ou 'refuse'."}, status=status.HTTP_400_BAD_REQUEST)

        user = req.user

        if action == "approve":
            req.status = "approved"
            req.admin_reason = ""
            req.save(update_fields=["status", "admin_reason", "updated_at"])
            user.can_challenge_with_pdf = True
            user.save(update_fields=["can_challenge_with_pdf"])
            UserNotification.objects.create(
                user=user,
                type="feature_approved",
                message="Votre demande d'activation du défi depuis PDF a été acceptée. La fonctionnalité est maintenant disponible !",
            )
        else:
            if not reason:
                return Response({"detail": "La raison du refus est requise."}, status=status.HTTP_400_BAD_REQUEST)
            req.status = "refused"
            req.admin_reason = reason
            req.save(update_fields=["status", "admin_reason", "updated_at"])
            UserNotification.objects.create(
                user=user,
                type="feature_refused",
                message=f"Votre demande a été refusée. Raison : {reason}",
            )

        return Response({"status": req.status})
