"""Validation des fichiers audio téléversés pour les sons du jeu."""

MAX_AUDIO_BYTES = 5 * 1024 * 1024  # 5 Mo
ALLOWED_EXTENSIONS = (".mp3", ".wav", ".ogg", ".m4a", ".aac")


def is_audio_file(file) -> bool:
    """Vrai si le fichier ressemble à un fichier audio (extension ou MIME)."""
    name = (getattr(file, "name", "") or "").lower()
    content_type = (getattr(file, "content_type", "") or "").lower()
    if content_type.startswith("audio/"):
        return True
    return name.endswith(ALLOWED_EXTENSIONS)


def audio_validation_error(file):
    """Retourne un message d'erreur si le fichier est invalide, sinon ``None``."""
    if not file:
        return "Aucun fichier audio fourni (champ 'audio')."
    if file.size > MAX_AUDIO_BYTES:
        return "Le fichier audio dépasse la limite de 5 Mo."
    if not is_audio_file(file):
        return "Format non supporté. Utilisez un fichier audio (.mp3, .wav, .ogg, .m4a)."
    return None
