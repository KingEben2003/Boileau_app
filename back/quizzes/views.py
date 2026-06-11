"""
quizzes/views.py
~~~~~~~~~~~~~~~~
Vue API REST pour la génération de quiz.

Endpoints :
  POST /api/quizzes/generate/
    - Reçoit un document_id, un type (qcm / true_false), une difficulté
      et un nombre de questions.
    - Appelle le service Gemini pour générer les questions.
    - Sauvegarde le quiz et ses questions en base, puis renvoie le tout.

  GET /api/quizzes/?document_id=X
    - Récupère tous les quiz d'un document.

  GET /api/quizzes/<id>/
    - Récupère un quiz spécifique avec ses questions.

  POST /api/quizzes/<id>/submit/
    - Soumet le résultat d'un quiz et met à jour les stats utilisateur.
"""

import datetime

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import Document

from .models import Quiz, Question, Result
from .serializers import QuizGenerateSerializer, QuizSerializer
from .services import GeminiServiceError, generate_quiz_with_gemini


class QuizListAPIView(APIView):
    """Vue pour lister les quiz d'un document ou en obtenir un spécifique."""

    def get(self, request, pk=None):
        user = self._resolve_user()
        
        # Si pk est fourni, retourner un quiz spécifique
        if pk:
            quiz = get_object_or_404(
                Quiz,
                id=pk,
                document__user=user,
            )
            return Response(QuizSerializer(quiz).data, status=status.HTTP_200_OK)
        
        # Sinon, lister les quiz d'un document
        document_id = request.query_params.get("document_id")
        
        if not document_id:
            return Response(
                {"detail": "Le paramètre document_id est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Vérifie que le document appartient à l'utilisateur
        document = get_object_or_404(Document, id=document_id, user=user)
        
        # Récupère tous les quiz du document
        quizzes = Quiz.objects.filter(document=document).order_by("-created_at")
        
        return Response(
            QuizSerializer(quizzes, many=True).data,
            status=status.HTTP_200_OK,
        )

    def _resolve_user(self):
        """Renvoie l'utilisateur authentifié.

        L'accès est protégé globalement par IsAuthenticated
        (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]), donc request.user
        est toujours un utilisateur authentifié à ce stade.
        """
        return self.request.user


class GenerateQuizAPIView(APIView):
    """Vue qui orchestre la génération d'un quiz via l'API Gemini.

    La réponse JSON contient le quiz complet avec ses questions
    (sérialisé via QuizSerializer qui inclut le QuestionSerializer imbriqué).
    """

    def post(self, request):
        # 1) Validation des données d'entrée
        serializer = QuizGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2) Résolution de l'utilisateur (authentifié ou démo)
        user = self._resolve_user()

        # 3) Récupération du document associé
        document = get_object_or_404(
            Document,
            id=serializer.validated_data["document_id"],
            user=user,
        )

        # 4) Vérification que le document contient du texte
        if not document.extracted_text:
            return Response(
                {
                    "detail": (
                        "Ce PDF ne contient pas de texte extractible (probablement un scan ou une image). "
                        "Appelez POST /api/documents/{id}/reextract/ pour retenter, "
                        "ou utilisez un PDF avec du texte natif."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quiz_type = serializer.validated_data["type"]
        difficulty = serializer.validated_data["difficulty"]
        number_of_questions = serializer.validated_data["number_of_questions"]

        # 5) Cache : si un quiz identique existe déjà, le renvoyer directement
        cached_quiz = (
            Quiz.objects.filter(document=document, type=quiz_type, difficulty=difficulty)
            .order_by("-created_at")
            .first()
        )
        if cached_quiz:
            cached_quiz.refresh_from_db()
            return Response(QuizSerializer(cached_quiz).data, status=status.HTTP_200_OK)

        # 6) Appel au service Gemini pour générer les questions
        try:
            questions_payload = generate_quiz_with_gemini(
                document.extracted_text,
                quiz_type,
                difficulty,
                number_of_questions,
            )
        except GeminiServiceError as exc:
            response_status = exc.status_code or status.HTTP_502_BAD_GATEWAY
            return Response({"detail": str(exc)}, status=response_status)

        # 6) Création du quiz en base de données
        quiz = Quiz.objects.create(
            document=document,
            type=quiz_type,
            difficulty=difficulty,
            number_of_questions=len(questions_payload),
        )

        # 7) Création de chaque question associée au quiz
        questions = []
        for item in questions_payload:
            questions.append(
                Question.objects.create(
                    quiz=quiz,
                    question_text=item.get("question_text", ""),
                    options=item.get("options") or [],
                    correct_answer=item.get("correct_answer", ""),
                    type=item.get("type", quiz_type),
                )
            )

        # 8) Rafraîchir le quiz pour inclure les questions via le serializer
        quiz.refresh_from_db()

        # 9) Réponse JSON structurée (quiz + questions imbriquées)
        return Response(QuizSerializer(quiz).data, status=status.HTTP_201_CREATED)

    def _resolve_user(self):
        """Renvoie l'utilisateur authentifié.

        L'accès est protégé globalement par IsAuthenticated
        (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]), donc request.user
        est toujours un utilisateur authentifié à ce stade.
        """
        return self.request.user


class SubmitQuizResultAPIView(APIView):
    """Vue pour soumettre le résultat d'un quiz et mettre à jour les stats.

    POST /api/quizzes/<id>/submit/
    Body : { score: float(0-100), time_spent_seconds: int, answers_detail: {} }
    """

    def post(self, request, pk):
        user = self._resolve_user()
        quiz = get_object_or_404(Quiz, id=pk, document__user=user)

        score = request.data.get("score")
        time_spent_seconds = request.data.get("time_spent_seconds")
        answers_detail = request.data.get("answers_detail")

        if score is None:
            return Response(
                {"detail": "Le champ 'score' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            score = float(score)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Le champ 'score' doit être un nombre."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (0 <= score <= 100):
            return Response(
                {"detail": "Le score doit être compris entre 0 et 100."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calcul mastery_after (algorithme pondéré 70/30)
        document = quiz.document
        last_result = Result.objects.filter(
            user=user, quiz__document=document
        ).order_by("-date_passed").first()

        if last_result and last_result.mastery_after is not None:
            mastery_after_value = round(0.7 * last_result.mastery_after + 0.3 * score, 1)
        else:
            mastery_after_value = round(score, 1)

        # Création du résultat
        result = Result.objects.create(
            user=user,
            quiz=quiz,
            score=score,
            time_spent_seconds=time_spent_seconds,
            answers_detail=answers_detail,
            mastery_after=mastery_after_value,
        )

        # Mise à jour des stats utilisateur
        from users.models import UserStats
        stats, _ = UserStats.objects.get_or_create(user=user)

        today = datetime.date.today()
        stats.total_quizzes += 1
        stats.total_score += score

        # Calcul du streak
        if stats.last_activity is None:
            stats.current_streak = 1
        elif stats.last_activity == today:
            # Déjà joué aujourd'hui, le streak ne change pas
            pass
        elif stats.last_activity == today - datetime.timedelta(days=1):
            # Lendemain : on prolonge le streak
            stats.current_streak += 1
        else:
            # Rupture du streak
            stats.current_streak = 1

        stats.last_activity = today

        # Logique de badges
        badges = list(stats.badges) if stats.badges else []

        if stats.total_quizzes == 1 and "Premier quiz" not in badges:
            badges.append("Premier quiz")

        if stats.current_streak >= 3 and "Série de 3" not in badges:
            badges.append("Série de 3")

        if score == 100.0 and "Parfait" not in badges:
            badges.append("Parfait")

        if "Expert" not in badges:
            high_score_count = Result.objects.filter(
                user=user, score__gte=80
            ).count()
            if high_score_count >= 5:
                badges.append("Expert")

        stats.badges = badges

        # Attribution XP
        base_xp = max(1, round(score / 10))  # 1-10 XP selon score
        streak_bonus = 2 if stats.current_streak > 1 else 0
        perfect_bonus = 5 if score == 100.0 else 0
        xp_gained = base_xp + streak_bonus + perfect_bonus
        stats.xp += xp_gained

        # Level up : level = 1 + xp // 100 (tous les 100 XP)
        stats.level = 1 + stats.xp // 100
        stats.save()

        # Mise à jour SRS après soumission d'un quiz
        try:
            from srs.models import SpacedRepetition
            from srs.views import sm2_update
            sr, _ = SpacedRepetition.objects.get_or_create(
                user=user,
                document=quiz.document,
                defaults={'next_review': datetime.date.today()}
            )
            sr.last_score = score
            sr = sm2_update(sr, score)
            sr.save()
        except Exception:
            pass  # SRS non bloquant

        return Response(
            {
                "result": {
                    "id": result.id,
                    "quiz_id": quiz.id,
                    "score": result.score,
                    "time_spent_seconds": result.time_spent_seconds,
                    "answers_detail": result.answers_detail,
                    "date_passed": result.date_passed,
                    "mastery_after": result.mastery_after,
                },
                "stats": {
                    "total_quizzes": stats.total_quizzes,
                    "avg_score": stats.get_avg_score(),
                    "current_streak": stats.current_streak,
                    "badges": stats.badges,
                    "last_activity": stats.last_activity,
                    "xp_gained": xp_gained,
                    "xp": stats.xp,
                    "level": stats.level,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    def _resolve_user(self):
        """Renvoie l'utilisateur authentifié.

        L'accès est protégé globalement par IsAuthenticated
        (REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]), donc request.user
        est toujours un utilisateur authentifié à ce stade.
        """
        return self.request.user

