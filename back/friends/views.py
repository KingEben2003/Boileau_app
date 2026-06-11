from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, FriendRequest
from .serializers import ChallengeSerializer, FriendRequestSerializer, FriendUserSerializer

User = get_user_model()


def _get_friend_ids(user):
    accepted = FriendRequest.objects.filter(
        Q(from_user=user) | Q(to_user=user), status="accepted"
    )
    ids = set()
    for req in accepted:
        ids.add(req.to_user_id if req.from_user_id == user.id else req.from_user_id)
    return ids


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
        # Was declined — allow re-send
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


class SendChallengeView(APIView):
    def post(self, request):
        friend_id = request.data.get("friend_id")
        try:
            opponent = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)
        challenge = Challenge.objects.create(challenger=request.user, opponent=opponent)
        return Response(ChallengeSerializer(challenge).data, status=status.HTTP_201_CREATED)


class SendDuelChallengeView(APIView):
    def post(self, request):
        from gamesettings.models import GameSettings

        friend_id = request.data.get("friend_id")
        try:
            opponent = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)
        if opponent == request.user:
            return Response({"error": "Vous ne pouvez pas vous défier vous-même"}, status=status.HTTP_400_BAD_REQUEST)

        # Valeurs par défaut définies par l'admin, surchargées par le demandeur.
        gs = GameSettings.load()
        num_questions = int(request.data.get("num_questions", gs.mp_num_questions))
        themes = request.data.get("themes", gs.mp_themes)
        types = request.data.get("types", gs.mp_types)
        difficulty = request.data.get("difficulty", gs.mp_difficulty)
        end_condition = request.data.get("end_condition", gs.mp_end_condition)
        timer_seconds = int(request.data.get("timer_seconds", gs.countdown_seconds))

        challenge = Challenge.objects.create(
            challenger=request.user,
            opponent=opponent,
            rounds=num_questions,
            themes=themes if isinstance(themes, list) else [],
            timer_seconds=timer_seconds,
            num_questions=num_questions,
            types=types if isinstance(types, list) else [],
            difficulty=difficulty,
            end_condition=end_condition,
        )
        return Response(ChallengeSerializer(challenge).data, status=status.HTTP_201_CREATED)


class DuelChallengeListView(APIView):
    def get(self, request):
        challenges = (
            Challenge.objects
            .filter(Q(challenger=request.user) | Q(opponent=request.user))
            .select_related("challenger", "opponent")
            .order_by("-created_at")
        )
        return Response(ChallengeSerializer(challenges, many=True).data)


class AcceptDuelChallengeView(APIView):
    def post(self, request, challenge_id):
        try:
            challenge = Challenge.objects.get(id=challenge_id, opponent=request.user, status="pending")
        except Challenge.DoesNotExist:
            return Response({"error": "Défi introuvable"}, status=status.HTTP_404_NOT_FOUND)
        challenge.status = "accepted"
        challenge.save(update_fields=["status"])
        return Response(ChallengeSerializer(challenge).data)
