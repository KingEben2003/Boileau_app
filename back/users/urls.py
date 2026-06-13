from django.urls import path

from .views import (
    UserProfileAPIView, RegisterView, LoginView, GoogleLoginView,
    LogoutView, CookieTokenRefreshView,
    ForgotPasswordView, VerifyCodeView, ResetPasswordView,
    SyncOneSignalPlayerView, PublicConfigView,
)

urlpatterns = [
    path("public-config/", PublicConfigView.as_view(), name="public-config"),
    path("me/", UserProfileAPIView.as_view(), name="user-profile"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("google-login/", GoogleLoginView.as_view(), name="google-login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("push/register-player/", SyncOneSignalPlayerView.as_view(), name="sync-onesignal"),
]
