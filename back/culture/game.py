"""Sélection des questions de jeu (Défi solo & multijoueur, Culture) depuis la banque admin."""

from .models import CultureQuestion


def normalize_question(q: CultureQuestion) -> dict:
    """Format commun renvoyé au front / utilisé par le consumer WebSocket.

    ``answer`` est la **chaîne** de la bonne option (les options culture stockent
    un index entier dans ``correct_answer``).
    """
    options = q.options or []
    answer = options[q.correct_answer] if 0 <= q.correct_answer < len(options) else ""
    return {
        "id": q.id,
        "theme": q.theme,
        "question": q.question,
        "type": q.type,
        "options": options,
        "answer": answer,
        "explanation": q.explanation,
    }


def select_game_questions(themes=None, types=None, difficulty=None, count=10):
    """Tire au hasard jusqu'à ``count`` questions filtrées par thèmes/types/difficulté."""
    qs = CultureQuestion.objects.all()
    if themes:
        qs = qs.filter(theme__in=themes)
    if types:
        qs = qs.filter(type__in=types)
    if difficulty:
        qs = qs.filter(difficulty=difficulty)
    count = max(1, min(int(count or 10), 50))
    return [normalize_question(q) for q in qs.order_by("?")[:count]]
