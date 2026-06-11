from django.urls import path
from .views import SRSDueView, SRSUpdateView, SRSAllView

urlpatterns = [
    path('srs/', SRSAllView.as_view(), name='srs-all'),
    path('srs/due/', SRSDueView.as_view(), name='srs-due'),
    path('srs/update/', SRSUpdateView.as_view(), name='srs-update'),
]
