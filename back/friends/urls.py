from django.urls import path

from .views import (
    AcceptChallengeView,
    AcceptFriendRequestView,
    AddFriendView,
    ChallengeDetailView,
    ChallengeListView,
    DeclineFriendRequestView,
    FriendListView,
    FriendRemoveView,
    FriendRequestListView,
    MarkNotificationsReadView,
    NotificationListView,
    RefuseChallengeView,
    SendChallengeView,
    SendFriendRequestView,
    SubmitChallengeAnswersView,
    UnreadNotificationCountView,
)

urlpatterns = [
    # Amis
    path("friends/", FriendListView.as_view(), name="friend-list"),
    path("friends/requests/", FriendRequestListView.as_view(), name="friend-requests"),
    path("friends/requests/<int:request_id>/accept/", AcceptFriendRequestView.as_view(), name="accept-friend-request"),
    path("friends/requests/<int:request_id>/decline/", DeclineFriendRequestView.as_view(), name="decline-friend-request"),
    path("friends/request/", SendFriendRequestView.as_view(), name="send-friend-request"),
    path("friends/add/", AddFriendView.as_view(), name="add-friend"),
    path("friends/<int:friend_id>/", FriendRemoveView.as_view(), name="friend-remove"),

    # Défis asynchrones
    path("challenges/", ChallengeListView.as_view(), name="challenge-list"),
    path("challenges/send/", SendChallengeView.as_view(), name="send-challenge"),
    path("challenges/<int:challenge_id>/", ChallengeDetailView.as_view(), name="challenge-detail"),
    path("challenges/<int:challenge_id>/accept/", AcceptChallengeView.as_view(), name="accept-challenge"),
    path("challenges/<int:challenge_id>/refuse/", RefuseChallengeView.as_view(), name="refuse-challenge"),
    path("challenges/<int:challenge_id>/submit/", SubmitChallengeAnswersView.as_view(), name="submit-challenge"),

    # Notifications
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/read/", MarkNotificationsReadView.as_view(), name="notifications-read"),
    path("notifications/unread-count/", UnreadNotificationCountView.as_view(), name="notifications-unread-count"),
]
