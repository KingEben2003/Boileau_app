from django.urls import path

from .views import (
    AcceptDuelChallengeView,
    AcceptFriendRequestView,
    AddFriendView,
    DeclineFriendRequestView,
    DuelChallengeListView,
    FriendListView,
    FriendRemoveView,
    FriendRequestListView,
    SendChallengeView,
    SendDuelChallengeView,
    SendFriendRequestView,
)

urlpatterns = [
    path("friends/", FriendListView.as_view(), name="friend-list"),
    path("friends/requests/", FriendRequestListView.as_view(), name="friend-requests"),
    path("friends/requests/<int:request_id>/accept/", AcceptFriendRequestView.as_view(), name="accept-friend-request"),
    path("friends/requests/<int:request_id>/decline/", DeclineFriendRequestView.as_view(), name="decline-friend-request"),
    path("friends/request/", SendFriendRequestView.as_view(), name="send-friend-request"),
    path("friends/add/", AddFriendView.as_view(), name="add-friend"),
    path("friends/<int:friend_id>/", FriendRemoveView.as_view(), name="friend-remove"),
    path("challenges/", DuelChallengeListView.as_view(), name="challenge-list"),
    path("challenges/send/", SendChallengeView.as_view(), name="send-challenge"),
    path("challenges/duel/", SendDuelChallengeView.as_view(), name="send-duel-challenge"),
    path("challenges/<int:challenge_id>/accept/", AcceptDuelChallengeView.as_view(), name="accept-duel-challenge"),
]
