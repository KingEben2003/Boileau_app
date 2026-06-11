"""documents/models.py
~~~~~~~~~~~~~~~~~~~
Modèle Django pour les documents PDF uploadés.

Chaque Document est lié à un utilisateur et contient :
  - file           : le fichier PDF stocké dans media/pdfs/.
  - extracted_text  : le texte brut extrait automatiquement à la sauvegarde.
  - upload_date     : date/heure de l'upload.

Lors de la première sauvegarde (ou si le fichier change),
le hook save() appelle extract_and_clean_pdf_text() pour remplir extracted_text.
"""

from django.db import models
from django.conf import settings

from .services import extract_and_clean_pdf_text


class Document(models.Model):
    """Représente un fichier PDF uploadé par un utilisateur."""

    # Propriétaire du document
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    # Nom original du fichier (sans extension), rempli à l'upload
    title = models.CharField(max_length=255, blank=True)
    # Fichier PDF stocké dans le dossier media/pdfs/
    file = models.FileField(upload_to='pdfs/')
    # Texte brut extrait automatiquement du PDF (rempli par le hook save)
    extracted_text = models.TextField(blank=True)
    # Date d'upload (auto)
    upload_date = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Override de save() pour extraire automatiquement le texte du PDF.

        Si le document est nouveau ou si le fichier a changé,
        on lance l'extraction puis on met à jour extracted_text.
        """
        is_new = self.pk is None
        # Détermine s'il faut vérifier le fichier
        should_check_file = (
            is_new
            or kwargs.get("update_fields") is None
            or "file" in kwargs.get("update_fields", [])
        )

        # Mémoriser l'ancien nom de fichier pour détecter un changement
        previous_file_name = None
        if self.pk and should_check_file:
            previous_file_name = (
                type(self)
                .objects.filter(pk=self.pk)
                .values_list("file", flat=True)
                .first()
            )

        # Sauvegarde classique (écrit le fichier sur disque)
        super().save(*args, **kwargs)

        if not should_check_file or not self.file:
            return

        # Si le fichier n'a pas changé, pas besoin de ré-extraire
        file_changed = is_new or previous_file_name != self.file.name
        if not file_changed:
            return

        # Extraction et nettoyage du texte du PDF
        cleaned_text = extract_and_clean_pdf_text(self.file.path)
        if cleaned_text != self.extracted_text:
            # Mise à jour directe en base (sans re-déclencher save)
            type(self).objects.filter(pk=self.pk).update(extracted_text=cleaned_text)
            self.extracted_text = cleaned_text

    def __str__(self):
        return f"{self.file.name} - {self.user.username}"
