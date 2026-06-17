from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .game import normalize_question, select_game_questions
from .models import CultureQuestion

User = get_user_model()


def make_question(**kwargs):
    defaults = {
        "theme": "football",
        "question": "Quel pays a gagné la CAN 2023 ?",
        "options": ["Nigéria", "Côte d'Ivoire", "Sénégal", "Maroc"],
        "correct_answer": 1,
        "type": "qcm",
        "difficulty": "easy",
    }
    defaults.update(kwargs)
    return CultureQuestion.objects.create(**defaults)


# ── Tests unitaires ────────────────────────────────────────────────────────────

class NormalizeQuestionTest(APITestCase):
    """normalize_question() renvoie le bon format."""

    def setUp(self):
        self.q = make_question()

    def test_has_required_keys(self):
        r = normalize_question(self.q)
        for key in ("id", "question", "options", "answer", "theme", "type", "explanation"):
            self.assertIn(key, r)

    def test_answer_is_correct_option_string(self):
        r = normalize_question(self.q)
        self.assertEqual(r["answer"], "Côte d'Ivoire")

    def test_out_of_bounds_answer_returns_empty(self):
        self.q.correct_answer = 99
        r = normalize_question(self.q)
        self.assertEqual(r["answer"], "")


class SelectGameQuestionsTest(APITestCase):
    """select_game_questions() filtre et limite correctement."""

    def setUp(self):
        make_question(theme="football", type="qcm",       difficulty="easy")
        make_question(theme="football", type="true_false", difficulty="hard",
                      options=["Vrai", "Faux"], correct_answer=0)
        make_question(theme="biologie", type="qcm",       difficulty="medium")

    def test_filter_by_theme(self):
        res = select_game_questions(themes=["football"])
        self.assertEqual(len(res), 2)
        for r in res:
            self.assertEqual(r["theme"], "football")

    def test_filter_by_type(self):
        res = select_game_questions(types=["true_false"])
        self.assertEqual(len(res), 1)

    def test_filter_by_difficulty(self):
        res = select_game_questions(difficulty="medium")
        self.assertEqual(len(res), 1)

    def test_combined_filters(self):
        res = select_game_questions(themes=["football"], types=["qcm"], difficulty="easy")
        self.assertEqual(len(res), 1)

    def test_no_filter_returns_all(self):
        res = select_game_questions()
        self.assertEqual(len(res), 3)

    def test_count_param_respected(self):
        for i in range(10):
            make_question(theme="sport", question=f"Q{i}")
        res = select_game_questions(themes=["sport"], count=5)
        self.assertEqual(len(res), 5)

    def test_unknown_theme_returns_empty(self):
        res = select_game_questions(themes=["theme_inexistant"])
        self.assertEqual(res, [])


# ── Tests d'intégration API ────────────────────────────────────────────────────

class CultureThemesEndpointTest(APITestCase):
    """GET /api/culture/themes/"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tuser", email="tuser@test.com", password="testpass123"
        )

    def test_requires_auth(self):
        url = reverse("culture-themes")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_list_of_themes(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("culture-themes"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)

    def test_themes_have_required_keys(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("culture-themes"))
        for theme in response.data:
            for key in ("key", "name", "icon", "description", "color", "category"):
                self.assertIn(key, theme)


class GameQuestionsEndpointTest(APITestCase):
    """GET /api/game/questions/"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="guser", email="guser@test.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        make_question(theme="football")
        make_question(theme="football")
        make_question(theme="biologie")

    def test_filter_by_theme(self):
        response = self.client.get(reverse("game-questions"), {"themes": "football"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_count_param(self):
        response = self.client.get(reverse("game-questions"), {"themes": "football", "count": 1})
        self.assertEqual(len(response.data), 1)

    def test_unknown_theme_returns_empty(self):
        response = self.client.get(reverse("game-questions"), {"themes": "xyz_inconnu"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_questions_have_answer_field(self):
        response = self.client.get(reverse("game-questions"), {"themes": "football"})
        for q in response.data:
            self.assertIn("answer", q)
            self.assertIn("options", q)

    def test_requires_auth(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("game-questions"), {"themes": "football"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
