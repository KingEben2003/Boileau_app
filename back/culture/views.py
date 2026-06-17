from django.db.models import Avg
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .game import select_game_questions
from .models import CultureQuestion, CultureResult
from .questions import CULTURE_THEMES


class CultureThemesView(APIView):
    def get(self, request):
        return Response(CULTURE_THEMES)


class GameQuestionsView(APIView):
    """GET /api/game/questions/?themes=a,b&types=qcm,true_false&difficulty=medium&count=10

    Renvoie des questions tirées au hasard de la banque, pour les jeux Solo/Culture.
    (Le multijoueur charge ses questions côté serveur dans le consumer WebSocket.)
    """

    def get(self, request):
        def _csv(name):
            return [v.strip() for v in request.query_params.get(name, "").split(",") if v.strip()]

        themes = _csv("themes")
        types = _csv("types")
        difficulty = request.query_params.get("difficulty", "").strip() or None
        try:
            count = int(request.query_params.get("count", 10))
        except (TypeError, ValueError):
            count = 10
        return Response(select_game_questions(themes or None, types or None, difficulty, count))


class CultureQuestionsView(APIView):
    def get(self, request):
        theme = request.query_params.get("theme", "").strip()
        if not theme:
            return Response({"error": "Thème invalide"}, status=status.HTTP_400_BAD_REQUEST)

        qs = CultureQuestion.objects.filter(theme=theme)
        if not qs.exists():
            return Response({"error": "Thème invalide"}, status=status.HTTP_400_BAD_REQUEST)

        # Format identique à l'ancien dictionnaire hardcodé
        questions = [
            {
                "id": q.id,
                "question": q.question,
                "options": q.options,
                "correct": q.options[q.correct_answer] if q.correct_answer < len(q.options) else "",
                "explanation": q.explanation,
            }
            for q in qs
        ]
        return Response(questions)


class CultureSubmitView(APIView):
    def post(self, request):
        theme = request.data.get("theme", "").strip()
        try:
            score = int(float(request.data.get("score", 0)))
        except (TypeError, ValueError):
            return Response({"error": "Score invalide"}, status=status.HTTP_400_BAD_REQUEST)
        total = CultureQuestion.objects.filter(theme=theme).count()

        if not theme or total == 0:
            return Response({"error": "Thème invalide"}, status=status.HTTP_400_BAD_REQUEST)

        CultureResult.objects.create(user=request.user, theme=theme, score=score, total=total)
        return Response({"status": "ok", "score": score, "total": total})


class CultureLeaderboardView(APIView):
    def get(self, request):
        theme = request.query_params.get("theme", "").strip()
        if not theme:
            return Response({"error": "Thème requis"}, status=status.HTTP_400_BAD_REQUEST)

        rows = (
            CultureResult.objects
            .filter(theme=theme)
            .values("user__id", "user__username", "user__first_name", "user__last_name")
            .annotate(avg_score=Avg("score"))
            .order_by("-avg_score")[:10]
        )

        leaderboard = [
            {
                "user_id": r["user__id"],
                "username": r["user__username"],
                "name": f"{r['user__first_name']} {r['user__last_name']}".strip() or r["user__username"],
                "avg_score": round(r["avg_score"] or 0, 1),
            }
            for r in rows
        ]
        return Response(leaderboard)
