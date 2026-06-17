import os
import random
import string
from datetime import timedelta

import requests as http_requests

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import FeatureRequest
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


def _set_auth_cookies(response, refresh, remember_me=True):
    """Attach httpOnly JWT cookies to *response*."""
    secure = getattr(settings, "JWT_AUTH_COOKIE_SECURE", not settings.DEBUG)
    samesite = getattr(settings, "JWT_AUTH_COOKIE_SAMESITE", "Lax")
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = (
        int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        if remember_me
        else None
    )

    response.set_cookie(
        key="access_token",
        value=str(refresh.access_token),
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=access_max_age,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=str(refresh),
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=refresh_max_age,
        path="/",
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        if "username" not in data and "email" in data:
            data["username"] = data["email"].split("@")[0]

        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            response = Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
            _set_auth_cookies(response, refresh, remember_me=True)
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get("identifier") or request.data.get("email") or "").strip()
        password = request.data.get("password", "")
        remember_me = bool(request.data.get("remember_me", True))

        user = (
            User.objects.filter(email__iexact=identifier).first()
            or User.objects.filter(username=identifier).first()
        )
        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            response = Response({"user": UserSerializer(user).data})
            _set_auth_cookies(response, refresh, remember_me=remember_me)
            return response
        return Response({"error": "Identifiants invalides"}, status=status.HTTP_401_UNAUTHORIZED)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        if not token:
            return Response({"error": "Token Google requis"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"id_token": token},
                timeout=10,
            )
        except Exception:
            return Response(
                {"error": "Impossible de vérifier le token Google"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if resp.status_code != 200:
            return Response({"error": "Token Google invalide"}, status=status.HTTP_401_UNAUTHORIZED)

        payload = resp.json()

        if str(payload.get("email_verified", "false")).lower() != "true":
            return Response(
                {"error": "Email non vérifié par Google"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        email = payload.get("email", "").strip()
        if not email:
            return Response({"error": "Email introuvable dans le token"}, status=status.HTTP_400_BAD_REQUEST)

        first_name = payload.get("given_name", "")
        last_name = payload.get("family_name", "")

        base_username = email.split("@")[0]
        try:
            user, created = User.objects.get_or_create(
                email__iexact=email,
                defaults={
                    "email": email,
                    "username": base_username,
                    "first_name": first_name,
                    "last_name": last_name,
                },
            )
        except IntegrityError:
            # username déjà pris : on suffixe avec les 4 premiers chiffres aléatoires
            suffix = "".join(random.choices(string.digits, k=4))
            user = User.objects.create_user(
                username=f"{base_username}_{suffix}",
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            created = True

        if not created and (not user.first_name and first_name):
            user.first_name = first_name
            user.last_name = last_name
            user.save(update_fields=["first_name", "last_name"])

        refresh = RefreshToken.for_user(user)
        response = Response({"user": UserSerializer(user).data})
        _set_auth_cookies(response, refresh, remember_me=True)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Déconnecté"})
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
        return response


class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get("refresh_token")
        if not raw_refresh:
            return Response({"error": "Session expirée"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(raw_refresh)
            secure = getattr(settings, "JWT_AUTH_COOKIE_SECURE", not settings.DEBUG)
            samesite = getattr(settings, "JWT_AUTH_COOKIE_SAMESITE", "Lax")
            access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())

            response = Response({"detail": "ok"})
            response.set_cookie(
                key="access_token",
                value=str(refresh.access_token),
                httponly=True,
                secure=secure,
                samesite=samesite,
                max_age=access_max_age,
                path="/",
            )
            return response
        except Exception:
            resp = Response(
                {"error": "Session expirée, veuillez vous reconnecter"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            resp.delete_cookie("access_token", path="/")
            resp.delete_cookie("refresh_token", path="/")
            return resp


class UserProfileAPIView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"error": "Email requis"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Aucun compte n'est associé à cet email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        code = "".join(random.choices(string.digits, k=6))
        user.reset_code = code
        user.reset_code_expires_at = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["reset_code", "reset_code_expires_at"])

        send_mail(
            subject="Réinitialisation de votre mot de passe Boileau",
            message=(
                f"Votre code de vérification est : {code}\n\n"
                "Ce code expire dans 10 minutes.\n\n"
                "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({"message": "Un code de vérification a été envoyé à votre adresse email."})


class VerifyCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        code = request.data.get("code", "").strip()

        if not email or not code:
            return Response({"error": "Email et code requis"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Code invalide ou expiré"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.reset_code or user.reset_code != code:
            return Response({"error": "Code invalide"}, status=status.HTTP_400_BAD_REQUEST)

        if user.reset_code_expires_at and timezone.now() > user.reset_code_expires_at:
            return Response({"error": "Code expiré. Recommencez la procédure."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Code valide"})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        code = request.data.get("code", "").strip()
        password = request.data.get("password", "")

        if not email or not code or not password:
            return Response({"error": "Tous les champs sont requis"}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response(
                {"error": "Le mot de passe doit contenir au moins 8 caractères"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Code invalide ou expiré"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.reset_code or user.reset_code != code:
            return Response({"error": "Code invalide"}, status=status.HTTP_400_BAD_REQUEST)

        if user.reset_code_expires_at and timezone.now() > user.reset_code_expires_at:
            return Response({"error": "Code expiré. Recommencez la procédure."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.reset_code = None
        user.reset_code_expires_at = None
        user.save(update_fields=["password", "reset_code", "reset_code_expires_at"])

        refresh = RefreshToken.for_user(user)
        response = Response({"message": "Mot de passe réinitialisé avec succès", "user": UserSerializer(user).data})
        _set_auth_cookies(response, refresh, remember_me=True)
        return response


class SyncOneSignalPlayerView(APIView):
    def post(self, request):
        player_id = request.data.get("onesignal_player_id", "").strip()
        if not player_id:
            return Response({"error": "onesignal_player_id requis"}, status=status.HTTP_400_BAD_REQUEST)

        request.user.onesignal_player_id = player_id
        request.user.save(update_fields=["onesignal_player_id"])
        return Response({"status": "ok"})


class PublicConfigView(APIView):
    """Expose la configuration publique du frontend (sans secrets sensibles)."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "google_client_id": settings.GOOGLE_CLIENT_ID,
            "onesignal_app_id": settings.ONESIGNAL_APP_ID,
        })


def _notify_admins_feature_request(user):
    """Notifie tous les admins par email et OneSignal d'une nouvelle demande de fonctionnalité."""
    admins = User.objects.filter(is_staff=True, is_active=True)
    admin_emails = list(admins.values_list("email", flat=True))

    if admin_emails:
        send_mail(
            subject="[Boileau] Nouvelle demande d'activation — Défi depuis PDF",
            message=(
                f"L'utilisateur {user.get_full_name() or user.username} ({user.email}) "
                "a soumis une demande d'activation de la fonctionnalité "
                "\"Défi depuis un cours PDF\".\n\n"
                "Connectez-vous à l'interface d'administration pour accepter ou refuser."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=True,
        )

    admin_player_ids = list(
        admins.exclude(onesignal_player_id__isnull=True)
        .exclude(onesignal_player_id="")
        .values_list("onesignal_player_id", flat=True)
    )
    if admin_player_ids:
        try:
            http_requests.post(
                "https://onesignal.com/api/v1/notifications",
                headers={
                    "Authorization": f"Basic {os.getenv('ONESIGNAL_REST_API_KEY', '')}",
                    "Content-Type": "application/json",
                },
                json={
                    "app_id": settings.ONESIGNAL_APP_ID,
                    "include_player_ids": admin_player_ids,
                    "headings": {"fr": "Nouvelle demande"},
                    "contents": {"fr": f"{user.get_full_name() or user.username} demande l'activation du défi PDF"},
                },
                timeout=5,
            )
        except Exception:
            pass


class SendFeatureRequestView(APIView):
    def post(self, request):
        user = request.user

        existing = FeatureRequest.objects.filter(user=user, status="pending").first()
        if existing:
            return Response({"status": "pending"}, status=status.HTTP_200_OK)

        if user.can_challenge_with_pdf:
            return Response({"status": "approved"}, status=status.HTTP_200_OK)

        FeatureRequest.objects.create(user=user)
        _notify_admins_feature_request(user)

        from friends.models import Notification as UserNotification
        from django.contrib.auth import get_user_model as _get
        for admin in _get().objects.filter(is_staff=True, is_active=True):
            UserNotification.objects.create(
                user=admin,
                type="feature_request",
                message=f"{user.get_full_name() or user.username} demande l'activation du défi depuis PDF.",
            )

        return Response({"status": "pending"}, status=status.HTTP_201_CREATED)


class FeatureRequestStatusView(APIView):
    def get(self, request):
        user = request.user
        if user.can_challenge_with_pdf:
            return Response({"status": "approved"})
        req = FeatureRequest.objects.filter(user=user).order_by("-created_at").first()
        if not req:
            return Response({"status": "none"})
        data = {"status": req.status}
        if req.status == "refused" and req.admin_reason:
            data["reason"] = req.admin_reason
        return Response(data)
