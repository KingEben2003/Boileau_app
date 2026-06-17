"""
summaries/services.py
~~~~~~~~~~~~~~~~~~~~~
Service qui appelle l'API REST Gemini pour générer un résumé
à partir du texte extrait d'un document PDF.

Flux :
  1. Construire le prompt adapté au type de résumé (brief / detailed).
  2. Envoyer une requête POST à l'endpoint REST v1beta de Gemini.
  3. Extraire le texte de la réponse JSON et le nettoyer.
  4. Renvoyer le résumé prêt à être stocké en base.
"""

import re

import requests
from django.conf import settings


# ── Exception personnalisée ─────────────────────────────────────────

class GeminiServiceError(Exception):
    """Levée quand l'appel à Gemini échoue (réseau, quota, modèle introuvable…).

    Attribut *status_code* : code HTTP à renvoyer au frontend.
    """

    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


# ── Construction du prompt ──────────────────────────────────────────

def _build_prompt(source_text: str, summary_type: str) -> str:
    """Construit le prompt envoyé à Gemini selon le type de résumé."""
    styles = {
        "brief": (
            "tres court et actionnable, MAXIMUM 150 mots",
            "Idee generale (2 phrases), Points cles (3-4 items max), Conclusion (1 phrase)",
        ),
        "medium": (
            "moyen et equilibre, MAXIMUM 300 mots",
            "Idee generale, Points cles developpes (5-6 items), Exemples essentiels, Conclusion",
        ),
        "detailed": (
            "detaille et pedagogique, MAXIMUM 500 mots",
            "Introduction, Idee generale, Points cles avec explication (max 8), Exemples, Conclusion",
        ),
    }
    style, structure = styles.get(summary_type, styles["brief"])
    return (
        "Tu es un assistant concis qui resume des documents academiques en francais. "
        f"Produis un resume {style}. Sois strict sur la limite de mots. "
        f"Structure attendue: {structure}.\n\n"
        "Texte source:\n"
        f"{source_text}"
    )


# ── Extraction du texte depuis la réponse Gemini ────────────────────

def _extract_text_from_response(payload: dict) -> str:
    """Parcourt le JSON de réponse Gemini et concatène les parties textuelles.

    La structure attendue (v1beta) est :
      { "candidates": [{ "content": { "parts": [{ "text": "..." }] } }] }
    """
    candidates = payload.get("candidates", [])
    if not candidates:
        return ""

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    # On ne garde que les parties ayant une clé "text"
    text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
    return "\n".join(part for part in text_parts if part).strip()


# ── Nettoyage Markdown ──────────────────────────────────────────────

def _clean_markdown_wrapper(text: str) -> str:
    """Supprime les éventuelles balises ```json ... ``` ou ``` ... ```
    que Gemini ajoute parfois autour de sa réponse.

    Utile si on attend du texte brut ou du JSON pur.
    """
    cleaned = text.strip()
    # Retirer le bloc ouvert ```json ou ``` en début
    cleaned = re.sub(r"^```(?:json|markdown)?\s*\n?", "", cleaned)
    # Retirer le bloc fermant ``` en fin
    cleaned = re.sub(r"\n?\s*```$", "", cleaned)
    return cleaned.strip()


# ── Gestion des erreurs HTTP Gemini ─────────────────────────────────

def _gemini_error_from_response(response) -> GeminiServiceError:
    """Transforme une réponse HTTP en erreur lisible pour l'utilisateur.

    Gère les cas courants : quota dépassé (429), accès refusé (401/403),
    modèle introuvable (404) et erreurs génériques.
    """
    status_code = response.status_code

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    error = payload.get("error", {}) if isinstance(payload, dict) else {}
    status_text = str(error.get("status", "")).upper()
    message = str(error.get("message", "")).strip()

    if status_code == 429 or status_text == "RESOURCE_EXHAUSTED":
        user_message = (
            "Quota Gemini depasse. Active la facturation du projet Google AI "
            "ou attends la prochaine fenetre de quota."
        )
    elif status_code in (401, 403):
        user_message = (
            "Acces Gemini refuse. Verifie la cle GEMINI_API_KEY "
            "et les permissions du projet."
        )
    elif status_code == 404:
        user_message = (
            "Modele Gemini introuvable. Verifie GEMINI_MODEL dans le fichier .env "
            "(doit etre un nom valide sans le prefixe 'models/')."
        )
    else:
        user_message = f"Erreur Gemini ({status_code})."

    if message:
        user_message = f"{user_message} Detail: {message}"

    return GeminiServiceError(user_message, status_code=status_code)


# ── Données mock (mode simulation) ─────────────────────────────────

def _mock_summary(summary_type: str) -> str:
    bodies = {
        "brief": (
            "## Résumé rapide *(mode simulation)*\n\n"
            "**Idée générale :** Ce document traite d'un sujet académique clé.\n\n"
            "**Points clés :**\n"
            "- Concept principal identifié\n"
            "- Deuxième idée importante\n"
            "- Troisième point à retenir\n\n"
            "**Conclusion :** Les notions abordées sont essentielles à maîtriser."
        ),
        "medium": (
            "## Résumé moyen *(mode simulation)*\n\n"
            "**Idée générale :** Ce document présente une analyse structurée d'un sujet académique.\n\n"
            "**Points développés :**\n"
            "- Premier concept avec développement\n"
            "- Deuxième axe d'analyse\n"
            "- Exemples pratiques mentionnés\n"
            "- Quatrième point approfondi\n\n"
            "**Exemples importants :** Illustrations tirées du texte source.\n\n"
            "**Conclusion :** Une maîtrise de ces points garantit une bonne compréhension."
        ),
        "detailed": (
            "## Résumé détaillé *(mode simulation)*\n\n"
            "### Introduction\n"
            "Ce document aborde en profondeur plusieurs thématiques interconnectées.\n\n"
            "### Idée générale\n"
            "Une analyse complète révèle des enjeux multidimensionnels.\n\n"
            "### Points clés\n"
            "1. **Premier concept** — Explication approfondie\n"
            "2. **Deuxième concept** — Analyse et implications\n"
            "3. **Troisième concept** — Liens avec les autres notions\n\n"
            "### Concepts avancés\n"
            "Les nuances théoriques enrichissent la compréhension globale.\n\n"
            "### Conclusion\n"
            "L'ensemble forme un corpus cohérent indispensable à l'étude du sujet."
        ),
    }
    return bodies.get(summary_type, bodies["brief"])


# ── Fonction principale : génération du résumé ──────────────────────

def generate_summary_with_gemini(source_text: str, summary_type: str) -> str:
    """Appelle l'API REST Gemini v1beta pour produire un résumé.

    Paramètres :
      - source_text  : texte extrait du PDF.
      - summary_type : "brief" ou "detailed".

    Retourne le résumé (str) ou lève GeminiServiceError.
    """

    # 0) Mode simulation : pas d'appel API
    if getattr(settings, "GEMINI_MOCK_MODE", False):
        return _mock_summary(summary_type)

    # 1) Vérifier que la clé API est présente
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise GeminiServiceError(
            "GEMINI_API_KEY manquante. Ajoute-la dans le fichier .env.",
            status_code=500,
        )

    # 2) Construire le chemin du modèle (le .env contient juste "gemini-2.0-flash")
    model = settings.GEMINI_MODEL.strip()
    if not model:
        model = "gemini-2.0-flash"

    # L'API REST attend "models/<nom>" dans l'URL
    model_path = model if model.startswith("models/") else f"models/{model}"

    # 3) URL de l'endpoint Gemini v1beta generateContent
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"{model_path}:generateContent"
    )

    # 4) Tronquer le texte source pour respecter la limite configurée
    max_chars = settings.GEMINI_SOURCE_MAX_CHARS
    truncated_source = (source_text or "")[:max_chars]

    # 5) Préparer le corps de la requête
    prompt = _build_prompt(truncated_source, summary_type)
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
    except requests.Timeout:
        raise GeminiServiceError(
            "La génération du résumé a pris trop de temps. Réessayez avec un document plus court.",
            status_code=504,
        )
    except requests.RequestException as exc:
        raise GeminiServiceError(
            f"Impossible de joindre le service Gemini. Vérifiez votre connexion.",
            status_code=502,
        ) from exc

    # 7) Vérifier le code de statut HTTP
    if response.status_code >= 400:
        raise _gemini_error_from_response(response)

    # 8) Parser le JSON de la réponse
    try:
        payload = response.json()
    except ValueError as exc:
        raise GeminiServiceError(
            "Reponse Gemini invalide (non JSON).", status_code=502
        ) from exc

    # 9) Extraire le texte généré depuis la structure candidates/parts
    summary_text = _extract_text_from_response(payload)
    if not summary_text:
        raise GeminiServiceError(
            "Gemini n'a retourne aucun contenu exploitable.", status_code=502
        )

    # 10) Nettoyer les éventuelles balises Markdown autour du texte
    summary_text = _clean_markdown_wrapper(summary_text)

    return summary_text
