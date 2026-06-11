"""
quizzes/services.py
~~~~~~~~~~~~~~~~~~~
Service qui appelle l'API REST Gemini pour générer un quiz
(QCM ou Vrai/Faux) à partir du texte extrait d'un document PDF.

Flux :
  1. Construire un prompt demandant un JSON structuré de questions.
  2. Envoyer la requête POST à l'endpoint REST v1beta de Gemini.
  3. Nettoyer la réponse (suppression des balises ```json Markdown).
  4. Parser le JSON, normaliser chaque question et renvoyer la liste.
"""

import json
import re
from typing import Any, Dict, List

import requests
from django.conf import settings

# On réutilise l'exception et le helper définis dans summaries/services.py
# afin d'éviter la duplication de code.
from summaries.services import GeminiServiceError, _gemini_error_from_response  # type: ignore


# ── Construction du prompt quiz ─────────────────────────────────────

def _build_quiz_prompt(
    source_text: str,
    quiz_type: str,
    difficulty: str,
    number_of_questions: int,
) -> str:
    """Construit le prompt envoyé à Gemini pour générer un quiz.

    Paramètres :
      - source_text          : texte issu du PDF (déjà tronqué).
      - quiz_type            : "qcm", "true_false" ou "mixed".
      - difficulty           : "easy", "medium" ou "hard".
      - number_of_questions  : nombre de questions à générer.
    """
    # Consigne de type selon le format demandé (jamais de question libre)
    if quiz_type == "mixed":
        type_instruction = (
            "Genere un quiz MIXTE melangeant des questions de type \"qcm\" et \"true_false\".\n"
            "Chaque question porte son propre champ \"type\" (\"qcm\" ou \"true_false\").\n"
        )
    elif quiz_type == "true_false":
        type_instruction = (
            "Genere un quiz ou TOUTES les questions sont de type \"true_false\" (Vrai/Faux).\n"
        )
    else:  # qcm par defaut
        type_instruction = (
            "Genere un quiz ou TOUTES les questions sont de type \"qcm\" (choix multiple).\n"
        )

    difficulty_label = {
        "easy": "facile",
        "medium": "intermediaire",
        "hard": "avance",
    }.get(difficulty, "intermediaire")

    capped = min(number_of_questions, 30)
    return (
        "Tu es un professeur qui cree des quiz en francais a partir d'un document academique.\n"
        f"{type_instruction}"
        f"Niveau de difficulte: {difficulty_label}.\n"
        f"Nombre de questions: {capped} (MAXIMUM 30, ne depasse jamais cette limite).\n\n"
        "CONTRAINTE IMPORTANTE: reponds UNIQUEMENT avec un JSON valide, sans texte avant ou apres.\n"
        "N'utilise JAMAIS de question ouverte / a reponse libre : uniquement \"qcm\" ou \"true_false\".\n"
        "Structure JSON attendue:\n"
        "{\n"
        '  \"questions\": [\n'
        "    {\n"
        '      \"question\": \"intitule de la question\",\n'
        '      \"type\": \"qcm\" ou \"true_false\",\n'
        '      \"options\": [\"option 1\", \"option 2\", \"option 3\", \"option 4\"], // pour qcm\n'
        '      \"correct_answer\": \"texte de la bonne reponse ou Vrai/Faux\"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Exigences supplementaires:\n"
        "- Les questions doivent se baser uniquement sur le texte fourni.\n"
        "- Varie les formulations et evite les questions triviales.\n"
        "- Pour les Vrai/Faux, fixe toujours options = [\"Vrai\", \"Faux\"].\n\n"
        "Texte source:\n"
        f"{source_text}"
    )


# ── Nettoyage Markdown du JSON ──────────────────────────────────────

def _clean_json_response(text: str) -> str:
    """Supprime les balises Markdown ```json ... ``` qui entourent parfois
    la réponse de Gemini, pour obtenir un JSON parsable.

    Exemple d'entrée :
        ```json\n{"questions": [...]}\n```
    Sortie :
        {"questions": [...]}
    """
    cleaned = text.strip()
    # Supprimer le bloc ouvert ```json ou ```
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
    # Supprimer le bloc fermant ```
    cleaned = re.sub(r"\n?\s*```$", "", cleaned)
    return cleaned.strip()


# ── Extraction et normalisation des questions ───────────────────────

def _extract_questions_from_payload(payload: dict) -> List[Dict[str, Any]]:
    """Extrait la liste de questions depuis le payload JSON de Gemini.

    Étapes :
      1. Récupère le texte brut depuis la structure candidates/parts.
      2. Nettoie les éventuelles balises Markdown.
      3. Parse le JSON.
      4. Normalise chaque question (clés attendues, options Vrai/Faux…).
    """
    # Réutilisation de la fonction d'extraction text définie dans summaries
    from summaries.services import _extract_text_from_response  # type: ignore

    raw_text = _extract_text_from_response(payload)
    if not raw_text:
        raise GeminiServiceError(
            "Gemini n'a retourne aucun contenu exploitable pour le quiz.",
            status_code=502,
        )

    # Nettoyage des balises ```json ... ``` autour du JSON
    raw = _clean_json_response(raw_text)

    # Tentative de parsing JSON
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise GeminiServiceError(
            "Impossible de parser la reponse Gemini en JSON. "
            "Reessaie avec un document plus court ou reformule le contenu.",
            status_code=502,
        ) from exc

    # Extraction de la liste "questions" depuis le JSON
    questions = data.get("questions") or []
    if not isinstance(questions, list) or not questions:
        raise GeminiServiceError(
            "Gemini n'a pas retourne de questions valides.", status_code=502
        )

    # Normalisation : on s'assure que chaque question a le bon format
    normalized: List[Dict[str, Any]] = []
    for q in questions:
        if not isinstance(q, dict):
            continue

        question_text = str(q.get("question") or "").strip()
        if not question_text:
            continue

        # Détermination du type de question
        q_type = str(q.get("type") or "").strip().lower()
        if q_type not in {"qcm", "true_false"}:
            q_type = "qcm"

        # Options de réponse
        options = q.get("options") or []
        if q_type == "true_false":
            options = ["Vrai", "Faux"]  # Forcer les options pour Vrai/Faux
        if not isinstance(options, list):
            options = []

        correct_answer = str(q.get("correct_answer") or "").strip()

        normalized.append(
            {
                "question_text": question_text,
                "options": options,
                "correct_answer": correct_answer,
                "type": q_type,
            }
        )

    if not normalized:
        raise GeminiServiceError(
            "Gemini a retourne un quiz vide.", status_code=502
        )

    return normalized


# ── Données mock (mode simulation) ─────────────────────────────────

def _mock_tf(i: int) -> Dict[str, Any]:
    return {
        "question_text": f"Affirmation de test n°{i+1} (simulation).",
        "options": ["Vrai", "Faux"],
        "correct_answer": "Vrai",
        "type": "true_false",
    }


def _mock_qcm(i: int) -> Dict[str, Any]:
    return {
        "question_text": f"Question de test n°{i+1} (simulation).",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "type": "qcm",
    }


def _mock_quiz(quiz_type: str, n: int) -> List[Dict[str, Any]]:
    if quiz_type == "true_false":
        return [_mock_tf(i) for i in range(n)]
    if quiz_type == "mixed":
        # Alterne QCM et Vrai/Faux
        return [_mock_qcm(i) if i % 2 == 0 else _mock_tf(i) for i in range(n)]
    return [_mock_qcm(i) for i in range(n)]


# ── Fonction principale : génération du quiz ────────────────────────

def generate_quiz_with_gemini(
    source_text: str,
    quiz_type: str,
    difficulty: str,
    number_of_questions: int,
) -> List[Dict[str, Any]]:
    """Appelle l'API REST Gemini v1beta pour produire un quiz structuré.

    Paramètres :
      - source_text          : texte extrait du PDF.
      - quiz_type            : "qcm" ou "true_false".
      - difficulty           : "easy", "medium" ou "hard".
      - number_of_questions  : nombre de questions souhaitées.

    Retourne une liste de dicts normalisés (question_text, options, …)
    ou lève GeminiServiceError.
    """

    # 0) Plafonner à 10 questions max
    number_of_questions = min(number_of_questions, 30)

    # 0b) Mode simulation : pas d'appel API
    if getattr(settings, "GEMINI_MOCK_MODE", False):
        return _mock_quiz(quiz_type, number_of_questions)

    # 1) Vérifier la présence de la clé API
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise GeminiServiceError(
            "GEMINI_API_KEY manquante. Ajoute-la dans le fichier .env.",
            status_code=500,
        )

    # 2) Construire le chemin du modèle
    model = settings.GEMINI_MODEL.strip() or "gemini-2.0-flash"
    model_path = model if model.startswith("models/") else f"models/{model}"

    # 3) URL de l'endpoint Gemini REST
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"{model_path}:generateContent"
    )

    # 4) Tronquer le texte source
    max_chars = settings.GEMINI_SOURCE_MAX_CHARS
    truncated_source = (source_text or "")[:max_chars]

    # 5) Préparer le prompt et le body de la requête
    prompt = _build_quiz_prompt(truncated_source, quiz_type, difficulty, number_of_questions)
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    # 6) Envoi de la requête HTTP POST
    try:
        response = requests.post(
            endpoint,
            params={"key": api_key},
            json=body,
            timeout=settings.GEMINI_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise GeminiServiceError(
            f"Echec d'appel Gemini: {exc}", status_code=502
        ) from exc

    # 7) Vérification du code HTTP
    if response.status_code >= 400:
        raise _gemini_error_from_response(response)

    # 8) Parser le JSON de la réponse HTTP
    try:
        payload = response.json()
    except ValueError as exc:
        raise GeminiServiceError(
            "Reponse Gemini invalide (non JSON).", status_code=502
        ) from exc

    # 9) Extraire, nettoyer et normaliser les questions
    return _extract_questions_from_payload(payload)

