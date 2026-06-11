"""
analytics/views.py
~~~~~~~~~~~~~~~~~~
Endpoints d'analyse et de progression pour l'utilisateur courant.

GET /api/analytics/summary/
    Retourne un tableau de bord global : documents, quiz, score moyen,
    streak, badges, scores récents et niveaux de maîtrise par document.

GET /api/analytics/progression/
    Retourne les scores agrégés par jour sur les 30 derniers jours.
"""

import datetime

from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import Document
from quizzes.models import Result
from users.models import UserStats


class AnalyticsSummaryView(APIView):
    """Vue qui retourne le tableau de bord analytique de l'utilisateur."""

    def get(self, request):
        user = self._resolve_user()

        # Statistiques de base
        total_documents = Document.objects.filter(user=user).count()
        total_quizzes = Result.objects.filter(user=user).count()

        avg_score_agg = Result.objects.filter(user=user).aggregate(avg=Avg("score"))
        avg_score = round(avg_score_agg["avg"] or 0.0, 1)

        # Streak et badges depuis UserStats
        try:
            stats = UserStats.objects.get(user=user)
            current_streak = stats.current_streak
            badges = stats.badges or []
            xp = stats.xp
            level = stats.level
        except UserStats.DoesNotExist:
            current_streak = 0
            badges = []
            xp = 0
            level = 1

        # 10 derniers résultats avec date, score, quiz_id et titre du document
        recent_results = (
            Result.objects.filter(user=user)
            .select_related("quiz__document")
            .order_by("-date_passed")[:10]
        )
        recent_scores = [
            {
                "date": r.date_passed.date().isoformat(),
                "score": r.score,
                "quiz_id": r.quiz_id,
                "document_title": r.quiz.document.file.name if r.quiz.document else "",
            }
            for r in recent_results
        ]

        # Niveau de maîtrise par document (moyenne des scores de tous les quiz associés)
        documents = Document.objects.filter(user=user).prefetch_related("quizzes__results")
        mastery_levels = []
        for doc in documents:
            doc_results = Result.objects.filter(user=user, quiz__document=doc)
            agg = doc_results.aggregate(avg=Avg("score"), count=Count("id"))
            mastery_levels.append(
                {
                    "document_id": doc.id,
                    "title": doc.file.name,
                    "mastery": round(agg["avg"] or 0.0, 1),
                    "quizzes_count": agg["count"],
                }
            )

        return Response(
            {
                "total_documents": total_documents,
                "total_quizzes": total_quizzes,
                "avg_score": avg_score,
                "current_streak": current_streak,
                "badges": badges,
                "xp": xp,
                "level": level,
                "recent_scores": recent_scores,
                "mastery_levels": mastery_levels,
            },
            status=status.HTTP_200_OK,
        )

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user


class AnalyticsProgressionView(APIView):
    """Vue qui retourne la progression (scores par jour) des 30 derniers jours."""

    def get(self, request):
        user = self._resolve_user()

        since = datetime.date.today() - datetime.timedelta(days=29)

        results = Result.objects.filter(
            user=user,
            date_passed__date__gte=since,
        ).order_by("date_passed")

        # Agrégation manuelle par date pour une compatibilité maximale
        daily: dict = {}
        for r in results:
            day = r.date_passed.date().isoformat()
            if day not in daily:
                daily[day] = {"scores": [], "count": 0}
            daily[day]["scores"].append(r.score)
            daily[day]["count"] += 1

        progression = [
            {
                "date": day,
                "avg_score": round(sum(v["scores"]) / v["count"], 1),
                "quizzes_count": v["count"],
            }
            for day, v in sorted(daily.items())
        ]

        return Response(progression, status=status.HTTP_200_OK)

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user


class AnalyzeWeaknessesView(APIView):
    """Appelle Gemini pour analyser les erreurs récurrentes de l'utilisateur."""

    def get(self, request):
        user = self._resolve_user()

        recent_results = (
            Result.objects.filter(user=user)
            .select_related("quiz__document")
            .order_by("-date_passed")[:20]
        )

        if not recent_results:
            return Response(
                {"analysis": "Pas encore assez de données. Faites des quiz pour obtenir une analyse personnalisée !"},
                status=status.HTTP_200_OK,
            )

        error_summary = []
        for r in recent_results:
            if r.answers_detail and r.score < 80:
                doc_name = r.quiz.document.file.name.split("/")[-1] if r.quiz.document else "?"
                error_summary.append(
                    f"Document: {doc_name} | Score: {r.score:.0f}% | Date: {r.date_passed.date()}"
                )

        if not error_summary:
            return Response(
                {"analysis": "Excellent ! Vos scores récents sont tous au-dessus de 80%. Continuez comme ça !"},
                status=status.HTTP_200_OK,
            )

        prompt = (
            "Tu es un tuteur IA bienveillant. Voici les performances récentes d'un étudiant :\n\n"
            + "\n".join(error_summary[:10])
            + "\n\nEn 3-4 phrases maximum, donne des conseils concrets et encourageants pour s'améliorer. "
            "Mentionne les documents concernés. Réponds en français."
        )

        import requests as http_requests
        from django.conf import settings

        api_key = settings.GEMINI_API_KEY
        model = settings.GEMINI_MODEL.strip()
        model_path = model if model.startswith("models/") else f"models/{model}"
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/{model_path}:generateContent"

        body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}

        try:
            resp = http_requests.post(
                endpoint,
                params={"key": api_key},
                json=body,
                timeout=settings.GEMINI_TIMEOUT_SECONDS,
            )
            if resp.status_code < 400:
                payload = resp.json()
                candidates = payload.get("candidates", [])
                text = ""
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text = "\n".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
                return Response({"analysis": text or "Analyse indisponible."}, status=status.HTTP_200_OK)
        except Exception:
            pass

        return Response(
            {"analysis": "Service d'analyse temporairement indisponible."},
            status=status.HTTP_200_OK,
        )

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user


class AnalyticsDashboardView(APIView):
    """Tableau de bord enrichi : benchmark, progression 7j, projection, documents faibles, XP/level."""

    def get(self, request):
        user = self._resolve_user()

        # --- Benchmark ---
        all_results = list(Result.objects.values("user").annotate(avg=Avg("score")))
        global_avg = round(
            sum(r["avg"] for r in all_results) / len(all_results) if all_results else 0.0, 1
        )

        user_avg_agg = Result.objects.filter(user=user).aggregate(avg=Avg("score"))
        user_avg = user_avg_agg["avg"] or 0.0

        users_below = sum(1 for r in all_results if r["avg"] < user_avg)
        user_percentile = round(users_below / len(all_results) * 100, 1) if all_results else 0.0

        # --- Progression 7 derniers jours ---
        since_7d = datetime.date.today() - datetime.timedelta(days=6)
        results_7d = Result.objects.filter(
            user=user, date_passed__date__gte=since_7d
        ).order_by("date_passed")

        daily: dict = {}
        for r in results_7d:
            day = r.date_passed.date().isoformat()
            daily.setdefault(day, []).append(r.score)

        progression_7d = [
            {"date": day, "avg_score": round(sum(scores) / len(scores), 1)}
            for day, scores in sorted(daily.items())
        ]

        # --- Score projeté ---
        last_10 = list(
            Result.objects.filter(user=user).order_by("-date_passed").values_list("score", flat=True)[:10]
        )
        last_10.reverse()  # chronologique
        if len(last_10) >= 2:
            slope = (last_10[-1] - last_10[0]) / len(last_10)
            projected_next_score = round(max(0.0, min(100.0, last_10[-1] + slope)), 1)
        elif last_10:
            projected_next_score = round(last_10[-1], 1)
        else:
            projected_next_score = 0.0

        # --- Documents les plus faibles (mastery_after du dernier Result, sinon avg) ---
        documents = Document.objects.filter(user=user)
        doc_masteries = []
        for doc in documents:
            last_res = (
                Result.objects.filter(user=user, quiz__document=doc)
                .order_by("-date_passed")
                .first()
            )
            if last_res and last_res.mastery_after is not None:
                mastery = last_res.mastery_after
            else:
                agg = Result.objects.filter(user=user, quiz__document=doc).aggregate(avg=Avg("score"))
                mastery = round(agg["avg"] or 0.0, 1)
            doc_masteries.append({"document_id": doc.id, "title": doc.file.name, "mastery": mastery})

        weakest_documents = sorted(doc_masteries, key=lambda d: d["mastery"])[:3]

        # --- XP / Level ---
        try:
            stats = UserStats.objects.get(user=user)
            xp = stats.xp
            level = stats.level
        except UserStats.DoesNotExist:
            xp = 0
            level = 1

        xp_to_next_level = (level * 100) - xp

        return Response(
            {
                "benchmark": {"global_avg": global_avg, "user_percentile": user_percentile},
                "progression_7d": progression_7d,
                "projected_next_score": projected_next_score,
                "weakest_documents": weakest_documents,
                "xp": xp,
                "level": level,
                "xp_to_next_level": xp_to_next_level,
            },
            status=status.HTTP_200_OK,
        )

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user


class DailyChallengesView(APIView):
    """Calcule les défis quotidiens de l'utilisateur basés sur son activité du jour."""

    def get(self, request):
        user = self._resolve_user()
        today = datetime.date.today()

        quizzes_today = Result.objects.filter(
            user=user, date_passed__date=today
        ).count()

        high_score_today = Result.objects.filter(
            user=user, date_passed__date=today, score__gte=80
        ).exists()

        docs_today = (
            Result.objects.filter(user=user, date_passed__date=today)
            .values_list("quiz__document_id", flat=True)
            .distinct()
            .count()
        )

        challenges = [
            {
                "id": 1,
                "label": "Faire 3 quiz",
                "target": 3,
                "progress": min(quizzes_today, 3),
                "reward": "50 XP",
            },
            {
                "id": 2,
                "label": "Obtenir 80%+ sur un quiz",
                "target": 1,
                "progress": 1 if high_score_today else 0,
                "reward": "30 XP",
            },
            {
                "id": 3,
                "label": "Réviser 2 documents",
                "target": 2,
                "progress": min(docs_today, 2),
                "reward": "Badge Assidu",
            },
        ]

        return Response(challenges, status=200)

    def _resolve_user(self):
        # Acces protege globalement par IsAuthenticated
        # (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]) :
        # request.user est toujours un utilisateur authentifie ici.
        return self.request.user
