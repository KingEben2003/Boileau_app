# Integration Notes - Gemini + Django + React

Ce fichier resume les regles de fonctionnement du projet en se basant sur le guide `gemini.txt`.

## 1) Source de verite de la configuration
- La configuration runtime est lue depuis `DjangoAPI/.env` via `python-decouple`.
- `gemini.txt` est un guide de reference, pas un fichier execute par l'application.

Variables principales attendues:
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_TIMEOUT_SECONDS`
- `GEMINI_SOURCE_MAX_CHARS`
- `SUMMARY_FALLBACK_ON_GEMINI_ERROR`

## 2) Flux applicatif actuel
- Front React envoie les requetes vers Django (`/api/...`).
- Django appelle Gemini via l'endpoint REST:
  - `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
- Retour Django -> React:
  - Resume en Markdown structure
  - Quiz en JSON structure

## 3) Endpoints backend utilises
- `POST /api/documents/` : upload PDF + extraction texte
- `POST /api/summaries/generate/` : generation du resume
- `POST /api/quizzes/generate/` : generation du quiz

## 4) Contraintes de prompt appliquees
Resume:
- Utilise `system_instruction`
- Reponse forcee en Markdown avec sections:
  - `## Idee generale`
  - `## Points cles`
  - `## Conclusion`

Quiz:
- Utilise `system_instruction`
- Reponse attendue en JSON (via `responseMimeType: application/json`)
- Schema logique: `question`, `options`, `answer`, `explanation`

## 5) Fallback en cas d'erreur Gemini
Si Gemini est indisponible / quota / modele invalide:
- Resume: generation locale de secours
- Quiz: generation locale de secours

## 6) Verification rapide
Backend:
- `python manage.py check`

Frontend:
- `npm.cmd run build`
- `CI=true npm.cmd test -- --watch=false --runInBand`

## 7) Bonnes pratiques de securite
- Ne jamais mettre la cle API en dur dans le code.
- Garder `.env` hors Git (deja ignore).
- En cas d'exposition accidentelle de la cle, la regenerer immediatement.
