import os

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, FriendRequest, Notification
from .serializers import (
    ChallengeSerializer,
    FriendRequestSerializer,
    FriendUserSerializer,
    NotificationSerializer,
)

User = get_user_model()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_friend_ids(user):
    accepted = FriendRequest.objects.filter(
        Q(from_user=user) | Q(to_user=user), status="accepted"
    )
    ids = set()
    for req in accepted:
        ids.add(req.to_user_id if req.from_user_id == user.id else req.from_user_id)
    return ids


def _send_onesignal_push(player_id, message, title="Boileau"):
    """Envoie une notification push OneSignal. Echoue silencieusement si non configuré."""
    import requests as req

    app_id = os.getenv("ONESIGNAL_APP_ID", "")
    api_key = os.getenv("ONESIGNAL_REST_API_KEY", "")
    if not app_id or not api_key or not player_id:
        return
    try:
        req.post(
            "https://onesignal.com/api/v1/notifications",
            json={
                "app_id": app_id,
                "include_player_ids": [player_id],
                "headings": {"fr": title, "en": title},
                "contents": {"fr": message, "en": message},
            },
            headers={"Authorization": f"Basic {api_key}"},
            timeout=5,
        )
    except Exception:
        pass


# ── Amis ────────────────────────────────────────────────────────────────────────

class FriendListView(APIView):
    def get(self, request):
        friends = User.objects.filter(id__in=_get_friend_ids(request.user))
        return Response(FriendUserSerializer(friends, many=True).data)


class FriendRemoveView(APIView):
    def delete(self, request, friend_id):
        FriendRequest.objects.filter(
            Q(from_user=request.user, to_user_id=friend_id) |
            Q(from_user_id=friend_id, to_user=request.user),
            status="accepted",
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendRequestListView(APIView):
    def get(self, request):
        reqs = (
            FriendRequest.objects
            .filter(to_user=request.user, status="pending")
            .select_related("from_user")
            .order_by("-created_at")
        )
        return Response(FriendRequestSerializer(reqs, many=True).data)


def _handle_send_request(request):
    pseudo = request.data.get("pseudo", "").strip()
    email = request.data.get("email", "").strip()

    if not pseudo and not email:
        return Response({"error": "Pseudo ou email requis"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target = User.objects.get(username=pseudo) if pseudo else User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"error": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)

    if target == request.user:
        return Response({"error": "Vous ne pouvez pas vous ajouter vous-même"}, status=status.HTTP_400_BAD_REQUEST)

    existing = FriendRequest.objects.filter(
        Q(from_user=request.user, to_user=target) |
        Q(from_user=target, to_user=request.user)
    ).first()

    if existing:
        if existing.status == "accepted":
            return Response({"error": "Vous êtes déjà amis"}, status=status.HTTP_400_BAD_REQUEST)
        if existing.status == "pending":
            return Response({"error": "Une demande est déjà en attente"}, status=status.HTTP_400_BAD_REQUEST)
        existing.status = "pending"
        existing.from_user = request.user
        existing.to_user = target
        existing.save(update_fields=["status", "from_user", "to_user"])
        return Response(FriendRequestSerializer(existing).data, status=status.HTTP_201_CREATED)

    req = FriendRequest.objects.create(from_user=request.user, to_user=target)
    return Response(FriendRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class SendFriendRequestView(APIView):
    def post(self, request):
        return _handle_send_request(request)


class AddFriendView(APIView):
    def post(self, request):
        return _handle_send_request(request)


class AcceptFriendRequestView(APIView):
    def post(self, request, request_id):
        try:
            req = FriendRequest.objects.get(id=request_id, to_user=request.user, status="pending")
        except FriendRequest.DoesNotExist:
            return Response({"error": "Demande introuvable"}, status=status.HTTP_404_NOT_FOUND)
        req.status = "accepted"
        req.save(update_fields=["status"])
        return Response(FriendRequestSerializer(req).data)


class DeclineFriendRequestView(APIView):
    def post(self, request, request_id):
        try:
            req = FriendRequest.objects.get(id=request_id, to_user=request.user, status="pending")
        except FriendRequest.DoesNotExist:
            return Response({"error": "Demande introuvable"}, status=status.HTTP_404_NOT_FOUND)
        req.status = "declined"
        req.save(update_fields=["status"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Défis asynchrones ──────────────────────────────────────────────────────────

class SendChallengeView(APIView):
    """Envoie un défi à un ami sur un quiz précis (après avoir joué en solo)."""
    def post(self, request):
        from quizzes.models import Quiz

        friend_id = request.data.get("friend_id")
        quiz_id = request.data.get("quiz_id")
        score = request.data.get("score")
        answers_detail = request.data.get("answers_detail", {})

        if not friend_id or not quiz_id:
            return Response({"error": "friend_id et quiz_id sont obligatoires"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            opponent = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)

        if opponent == request.user:
            return Response({"error": "Vous ne pouvez pas vous défier vous-même"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quiz = Quiz.objects.select_related("document").get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({"error": "Quiz introuvable"}, status=status.HTTP_404_NOT_FOUND)

        challenge = Challenge.objects.create(
            challenger=request.user,
            opponent=opponent,
            quiz=quiz,
            challenger_score=score,
            challenger_answers=answers_detail,
        )

        # Notification interne pour l'adversaire
        doc_title = (quiz.document.title or "un quiz")[:40]
        Notification.objects.create(
            user=opponent,
            type="challenge_received",
            challenge=challenge,
            message=f"{request.user.username} vous a lancé un défi sur « {doc_title} » !",
        )

        return Response(ChallengeSerializer(challenge).data, status=status.HTTP_201_CREATED)


class ChallengeListView(APIView):
    """Liste tous les défis de l'utilisateur (envoyés et reçus)."""
    def get(self, request):
        challenges = (
            Challenge.objects
            .filter(Q(challenger=request.user) | Q(opponent=request.user))
            .select_related("challenger", "opponent", "quiz", "quiz__document", "winner")
            .order_by("-created_at")
        )
        return Response(ChallengeSerializer(challenges, many=True).data)


class ChallengeDetailView(APIView):
    def get(self, request, challenge_id):
        try:
            challenge = Challenge.objects.select_related(
                "challenger", "opponent", "quiz", "quiz__document", "winner"
            ).get(
                Q(challenger=request.user) | Q(opponent=request.user),
                id=challenge_id,
            )
        except Challenge.DoesNotExist:
            return Response({"error": "Défi introuvable"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChallengeSerializer(challenge).data)


class AcceptChallengeView(APIView):
    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id, opponent=request.user, status="pending")
        except Challenge.DoesNotExist:
            return Response({"error": "Défi introuvable"}, status=status.HTTP_404_NOT_FOUND)
        challenge.status = "accepted"
        challenge.save(update_fields=["status", "updated_at"])
        return Response(ChallengeSerializer(challenge).data)


class RefuseChallengeView(APIView):
    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id, opponent=request.user, status="pending")
        except Challenge.DoesNotExist:
            return Response({"error": "Défi introuvable"}, status=status.HTTP_404_NOT_FOUND)
        challenge.status = "refused"
        challenge.save(update_fields=["status", "updated_at"])

        Notification.objects.create(
            user=challenge.challenger,
            type="challenge_refused",
            challenge=challenge,
            message=f"{request.user.username} a refusé votre défi.",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubmitChallengeAnswersView(APIView):
    """L'adversaire soumet ses réponses, ce qui termine le défi et notifie le challenger."""
    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.select_related("challenger", "opponent").get(
                id=challenge_id, opponent=request.user, status="accepted"
            )
        except Challenge.DoesNotExist:
            return Response({"error": "Défi introuvable ou non accepté"}, status=status.HTTP_404_NOT_FOUND)

        score = request.data.get("score")
        answers_detail = request.data.get("answers_detail", {})

        challenge.opponent_score = score
        challenge.opponent_answers = answers_detail
        challenge.status = "completed"

        # Déterminer le gagnant
        c_score = challenge.challenger_score or 0
        try:
            o_score = float(score) if score is not None else 0
        except (TypeError, ValueError):
            o_score = 0
        if c_score > o_score:
            challenge.winner = challenge.challenger
        elif o_score > c_score:
            challenge.winner = challenge.opponent
        # égalité → winner reste None

        challenge.save()

        # Notification interne pour le challenger
        opp_name = request.user.username
        if challenge.winner == challenge.challenger:
            msg = f"Vous avez battu {opp_name} ! 🏆 ({c_score:.0f}% vs {o_score:.0f}%)"
        elif challenge.winner == challenge.opponent:
            msg = f"{opp_name} vous a battu. 😅 ({c_score:.0f}% vs {o_score:.0f}%)"
        else:
            msg = f"Égalité avec {opp_name} ! ({c_score:.0f}%)"

        Notification.objects.create(
            user=challenge.challenger,
            type="challenge_result",
            challenge=challenge,
            message=msg,
        )

        # Notification push OneSignal (si configuré)
        player_id = getattr(challenge.challenger, "onesignal_player_id", None)
        _send_onesignal_push(player_id, msg)

        return Response(ChallengeSerializer(challenge).data)


# ── Notifications ──────────────────────────────────────────────────────────────

class NotificationListView(APIView):
    def get(self, request):
        notifs = Notification.objects.filter(user=request.user)[:50]
        return Response(NotificationSerializer(notifs, many=True).data)


class MarkNotificationsReadView(APIView):
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})


class UnreadNotificationCountView(APIView):
    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"count": count})
