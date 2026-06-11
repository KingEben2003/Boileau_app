from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailOrUsernameBackend(ModelBackend):
    """Allows Django admin (and any auth call) to accept email or username."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        user = (
            User.objects.filter(email__iexact=username).first()
            or User.objects.filter(username=username).first()
        )
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
