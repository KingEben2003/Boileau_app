from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from culture.models import CultureQuestion

User = get_user_model()

LIST_URL  = "/api/admin/culture-questions/"
STATS_URL = "/api/admin/stats/"


def make_question(**kwargs):
    defaults = {
        "theme": "football",
        "question": "Quel club a remporté la Ligue des Champions 2024 ?",
        "options": ["Real Madrid", "Bayern Munich", "Manchester City", "PSG"],
        "correct_answer": 0,
        "type": "qcm",
        "difficulty": "medium",
        "explanation": "Le Real Madrid a battu le Dortmund en finale.",
    }
    defaults.update(kwargs)
    return CultureQuestion.objects.create(**defaults)


class AdminAccessControlTest(APITestCase):
    """Vérification que les endpoints admin rejettent les non-admins."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="regular", email="regular@test.com", password="testpass123"
        )
        self.admin = User.objects.create_user(
            username="admin", email="admin@test.com",
            password="adminpass123", is_staff=True,
        )

    def test_list_rejects_unauthenticated(self):
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_rejects_non_admin(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_rejects_non_admin(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(STATS_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_list_accessible_to_admin(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_200_OK)


class AdminCultureListFilterTest(APITestCase):
    """Filtres theme / type / difficulty sur la liste des questions."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin2", email="admin2@test.com",
            password="adminpass123", is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

        make_question(theme="football",  type="qcm",        difficulty="easy")
        make_question(theme="football",  type="true_false",  difficulty="hard",
                      options=["Vrai", "Faux"], correct_answer=0)
        make_question(theme="biologie",  type="qcm",        difficulty="medium")

    def test_no_filter_returns_all(self):
        response = self.client.get(LIST_URL)
        self.assertEqual(len(response.data), 3)

    def test_filter_by_theme(self):
        response = self.client.get(LIST_URL, {"theme": "football"})
        self.assertEqual(len(response.data), 2)
        for q in response.data:
            self.assertEqual(q["theme"], "football")

    def test_filter_by_type(self):
        response = self.client.get(LIST_URL, {"type": "true_false"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "true_false")

    def test_filter_by_difficulty(self):
        response = self.client.get(LIST_URL, {"difficulty": "hard"})
        self.assertEqual(len(response.data), 1)

    def test_filter_combined(self):
        response = self.client.get(LIST_URL, {"theme": "football", "type": "qcm"})
        self.assertEqual(len(response.data), 1)

    def test_filter_no_match_returns_empty(self):
        response = self.client.get(LIST_URL, {"theme": "inexistant"})
        self.assertEqual(response.data, [])


class AdminCultureCRUDTest(APITestCase):
    """Création, modification et suppression de questions."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin3", email="admin3@test.com",
            password="adminpass123", is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_create_question(self):
        data = {
            "theme": "biologie",
            "question": "Qu'est-ce que l'ADN ?",
            "options": ["Un acide nucléique", "Une protéine", "Un lipide", "Un glucide"],
            "correct_answer": 0,
            "type": "qcm",
            "difficulty": "medium",
            "explanation": "ADN = acide désoxyribonucléique.",
        }
        response = self.client.post(LIST_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CultureQuestion.objects.filter(theme="biologie").count(), 1)

    def test_create_requires_min_2_options(self):
        data = {
            "theme": "football",
            "question": "Question invalide ?",
            "options": ["Seule réponse"],
            "correct_answer": 0,
            "type": "qcm",
            "difficulty": "easy",
        }
        response = self.client.post(LIST_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_requires_theme(self):
        data = {
            "question": "Sans thème ?",
            "options": ["A", "B"],
            "correct_answer": 0,
            "type": "qcm",
            "difficulty": "easy",
        }
        response = self.client.post(LIST_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_question(self):
        q = make_question(question="Question originale ?")
        detail_url = f"/api/admin/culture-questions/{q.id}/"
        response = self.client.patch(detail_url, {"question": "Question modifiée ?"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.question, "Question modifiée ?")

    def test_patch_changes_difficulty(self):
        q = make_question(difficulty="easy")
        detail_url = f"/api/admin/culture-questions/{q.id}/"
        response = self.client.patch(detail_url, {"difficulty": "hard"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        q.refresh_from_db()
        self.assertEqual(q.difficulty, "hard")

    def test_delete_question(self):
        q = make_question()
        detail_url = f"/api/admin/culture-questions/{q.id}/"
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CultureQuestion.objects.filter(pk=q.id).exists())

    def test_delete_nonexistent_returns_404(self):
        response = self.client.delete("/api/admin/culture-questions/99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_response_includes_type_and_difficulty(self):
        q = make_question(type="true_false", difficulty="hard", options=["Vrai", "Faux"])
        detail_url = f"/api/admin/culture-questions/{q.id}/"
        response = self.client.patch(detail_url, {}, format="json")
        self.assertIn("type", response.data)
        self.assertIn("difficulty", response.data)
