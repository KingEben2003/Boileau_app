"""documents/services.py
~~~~~~~~~~~~~~~~~~~~~
Service d'extraction et de nettoyage du texte contenu dans les fichiers PDF.

Utilise pypdf (ou PyPDF2 en fallback) pour lire les pages du PDF
et en extraire le texte brut, qui est ensuite nettoyé (retrait des
caractères de contrôle, recollage des mots coupés, etc.).
"""

import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)


def _get_pdf_reader():
    """Tente d'importer une classe PdfReader compatible."""
    try:
        from pypdf import PdfReader  # type: ignore
        return PdfReader
    except Exception:
        pass
    try:
        from PyPDF2 import PdfReader  # type: ignore
        return PdfReader
    except Exception:
        return None


def extract_pdf_text(file_path) -> str:
    """Lit un fichier PDF et retourne le texte brut de toutes ses pages."""
    pdf_reader_class = _get_pdf_reader()
    if pdf_reader_class is None:
        logger.error("pypdf non installé. Lancez: pip install pypdf")
        return ""

    path = Path(file_path)
    if not path.exists():
        logger.error("Fichier PDF introuvable: %s", path)
        return ""

    try:
        # Ouverture explicite en binaire pour éviter les problèmes Windows
        with open(path, "rb") as f:
            reader = pdf_reader_class(f)
            pages_text = []
            for i, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        pages_text.append(page_text)
                except Exception as page_err:
                    logger.warning("Erreur page %d: %s", i, page_err)

            if not pages_text:
                logger.warning(
                    "Aucun texte extrait de %s — PDF probablement basé sur des images (scan).",
                    path.name,
                )
            return "\n".join(pages_text)

    except Exception as exc:
        logger.exception("Impossible de lire le PDF %s : %s", path.name, exc)
        return ""


def clean_extracted_text(text: str) -> str:
    """Nettoie le texte extrait d'un PDF.

    Opérations :
      - Normalise les retours à la ligne (\\r\\n → \\n).
      - Supprime les caractères de contrôle (sauf \\n et \\t).
      - Recolle les mots coupés en fin de ligne (ex: "infor-\\nmation" → "information").
      - Réduit les espaces multiples et les sauts de ligne superflus.
    """
    if not text:
        return ""

    # Normalisation des retours à la ligne
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    # Retrait des caractères de contrôle (garde \n et \t)
    cleaned = "".join(ch for ch in cleaned if ch == "\n" or ch == "\t" or ord(ch) >= 32)

    # Recollage des mots coupés en fin de ligne : "infor-\nmation" → "information"
    cleaned = re.sub(r"([A-Za-z0-9])-\n([A-Za-z0-9])", r"\1\2", cleaned)

    # Nettoyage des espaces et sauts de ligne superflus
    cleaned = re.sub(r"[ \t\f\v]+", " ", cleaned)
    cleaned = "\n".join(line.strip() for line in cleaned.split("\n"))
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    return cleaned.strip()


def extract_and_clean_pdf_text(file_path) -> str:
    """Combine extraction puis nettoyage du texte d'un PDF."""
    raw_text = extract_pdf_text(file_path)
    return clean_extracted_text(raw_text)
