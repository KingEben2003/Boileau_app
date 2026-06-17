"""
URL configuration for APIBoileau project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)


def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    payload = {"status": "ok" if db_ok else "degraded", "db": "ok" if db_ok else "error"}
    return JsonResponse(payload, status=200 if db_ok else 503)


urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    path("api/", include("documents.urls")),
    path("api/", include("summaries.urls")),
    path("api/", include("quizzes.urls")),
    path("api/", include("users.urls")),
    path("api/", include("analytics.urls")),
    path("api/", include("srs.urls")),
    path("api/", include("friends.urls")),
    path("api/", include("culture.urls")),
    path("api/", include("gamesounds.urls")),
    path("api/", include("gamesettings.urls")),
    path("api/admin/", include("adminapi.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
