from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

LIST_URL   = "/api/register/"
LOGIN_URL  = "/api/login/"
PROFILE_URL = "/api/me/"
PUBLIC_CONFIG_URL = "/api/public-config/"


class RegisterTest(APITestCase):
    """POST /api/register/"""

    def test_register_creates_user(self):
        data = {
            "username": "kofikoffi",
            "email": "koffi@test.com",
            "password": "SecurePass123!",
            "first_name": "Koffi",
            "last_name": "Atta",
        }
        response = self.client.post(LIST_URL, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="koffi@test.com").exists())

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(
            username="existing", email="dup@test.com", password="testpass123"
        )
        data = {"username": "autre", "email": "dup@test.com", "password": "SecurePass123!"}
        response = self.client.post(LIST_URL, data)
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)

    def test_register_rejects_weak_password(self):
        data = {"username": "user99", "email": "weak@test.com", "password": "123"}
        response = self.client.post(LIST_URL, data)
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)

    def test_register_rejects_missing_email(self):
        response = self.client.post(LIST_URL, {"username": "abc", "password": "SecurePass123!"})
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)


class LoginTest(APITestCase):
    """POST /api/login/"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="loginuser",
            email="login@test.com",
            password="testpass123",
        )

    def test_login_success_returns_200(self):
        response = self.client.post(LOGIN_URL, {"email": "login@test.com", "password": "testpass123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_wrong_password_rejected(self):
        response = self.client.post(LOGIN_URL, {"email": "login@test.com", "password": "wrong"})
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_login_unknown_email_rejected(self):
        response = self.client.post(LOGIN_URL, {"email": "nobody@test.com", "password": "testpass123"})
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])


class ProfileTest(APITestCase):
    """GET /api/me/"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="profileuser",
            email="profile@test.com",
            password="testpass123",
            first_name="Akissi",
            last_name="Brou",
        )

    def test_profile_requires_auth(self):
        self.assertEqual(self.client.get(PROFILE_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_user_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("email"), "profile@test.com")

    def test_profile_contains_expected_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(PROFILE_URL)
        for field in ("email", "username", "first_name", "last_name"):
            self.assertIn(field, response.data)


class PublicConfigTest(APITestCase):
    """GET /api/public-config/ — accessible sans auth."""

    def test_accessible_anonymously(self):
        response = self.client.get(PUBLIC_CONFIG_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
