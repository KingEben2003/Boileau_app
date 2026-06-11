"""
gemini_client.py
~~~~~~~~~~~~~~~~
Module utilitaire qui encapsule les appels au SDK google-generativeai.

NOTE : ce fichier n'est PAS utilisé par les services Django actuels
(summaries/services.py et quizzes/services.py appellent l'API REST directement).
Il est conservé comme alternative si l'on souhaite passer au SDK Python officiel.
"""

import json
import os
import re

import google.generativeai as genai

# ── Configuration du SDK ────────────────────────────────────────────
# La clé API est lue depuis la variable d'environnement GEMINI_API_KEY
# (chargée par le fichier .env via settings.py).
try:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
except Exception as e:
    print(f"Erreur de configuration de Gemini: {e}")


# ── Nom du modèle par défaut ────────────────────────────────────────
# gemini-1.5-flash est déprécié ; on utilise désormais gemini-2.0-flash.
# Le SDK attend le nom COURT (sans le préfixe "models/").
DEFAULT_MODEL = "gemini-2.0-flash"


def _clean_json_response(text: str) -> str:
    """Supprime les balises Markdown ```json ... ``` qui entourent parfois
    la réponse de Gemini, afin d'obtenir une chaîne JSON pure."""
    cleaned = text.strip()
    # Retirer le bloc ``` éventuel
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


# ── Prompts de résumé ───────────────────────────────────────────────

def get_summary_prompt(summary_type: str) -> str:
    """Renvoie le prompt système adapté au type de résumé demandé."""
    prompts = {
        "brief": (
            "Fais un résumé très court et concis (environ 100 mots) de ce texte. "
            "Concentre-toi sur l'idée principale."
        ),
        "medium": (
            "Fais un résumé structuré de longueur moyenne (environ 300 mots) de ce texte. "
            "Inclus les points clés."
        ),
        "detailed": (
            "Fais un résumé détaillé et approfondi de ce texte. "
            "Analyse les arguments, les preuves et les conclusions."
        ),
    }
    return prompts.get(summary_type, prompts["brief"])


def generate_summary_from_text(text: str, summary_type: str = "brief") -> str | None:
    """Génère un résumé du *text* via l'API Gemini (SDK Python).

    Retourne le texte du résumé ou None en cas d'échec.
    """
    if not os.environ.get("GEMINI_API_KEY"):
        raise ValueError("La clé API Gemini n'est pas configurée.")

    # Récupère le nom du modèle depuis l'environnement (valeur par défaut sûre)
    model_name = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    model = genai.GenerativeModel(model_name)

    full_prompt = f"{get_summary_prompt(summary_type)}\n\nTexte source:\n{text}"

    try:
        response = model.generate_content(full_prompt)
        # response.text contient directement le texte généré
        return response.text
    except Exception as e:
        print(f"Erreur lors de la génération du résumé : {e}")
        return None


# ── Génération de quiz ──────────────────────────────────────────────

def generate_quiz_from_text(text: str, num_questions: int, quiz_type: str) -> str | None:
    """Génère un quiz JSON à partir du *text* via l'API Gemini (SDK Python).

    Retourne une chaîne JSON (liste de questions) ou None en cas d'échec.
    """
    if not os.environ.get("GEMINI_API_KEY"):
        raise ValueError("La clé API Gemini n'est pas configurée.")

    model_name = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    model = genai.GenerativeModel(model_name)

    # Instructions pour que Gemini renvoie un JSON structuré
    json_format_instruction = """
    Le résultat doit être une liste JSON d'objets. Chaque objet représente une question et doit avoir les clés suivantes:
    - "question": (string) Le texte de la question.
    - "options": (array of strings) La liste des choix pour un QCM. Laisser ce tableau vide ([]) pour une question ouverte.
    - "answer": (string) La bonne réponse.
    - "explanation": (string) Une brève explication de la réponse.
    """
    prompt = (
        f"Génère un quiz de {num_questions} questions de type '{quiz_type}' "
        f"basé sur le texte suivant. {json_format_instruction}\n\n"
        f"Texte source:\n{text}"
    )

    # On demande à Gemini de répondre directement en JSON
    generation_config = {
        "response_mime_type": "application/json",
    }

    try:
        response = model.generate_content(prompt, generation_config=generation_config)
        raw = response.text

        # Nettoyage des éventuelles balises ```json entourant la réponse
        cleaned = _clean_json_response(raw)

        # Validation : on vérifie que c'est bien du JSON valide
        json.loads(cleaned)
        return cleaned
    except Exception as e:
        print(f"Erreur lors de la génération du quiz : {e}")
        return None