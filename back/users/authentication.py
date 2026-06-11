from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    """Reads JWT from the 'access_token' httpOnly cookie, falls back to Bearer header."""

    def authenticate(self, request):
        raw_token = request.COOKIES.get("access_token")
        if raw_token:
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except (InvalidToken, TokenError):
                pass
        return super().authenticate(request)
