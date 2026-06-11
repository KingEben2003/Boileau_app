# Fonctionnalités du projet Boileau

## 1. Fonctionnalités implémentées

### Gestion des Utilisateurs
Système d'authentification sécurisé (JWT) comprenant l'inscription, la connexion (email/mot de passe et Google OAuth), la gestion du profil (avatar, mot de passe) et un accès à l'historique personnel des documents et scores.

### Gestion des Documents PDF
Module de téléversement par "glisser-déposer", extraction automatique du texte (pypdf), nettoyage des données et archivage pour consultation ultérieure. Bouton de ré-extraction pour les PDFs problématiques.

### Module de Résumé Intelligent
Génération de résumés avec trois niveaux de précision (Bref, Moyen, Détaillé), rendu Markdown sur interface et exportation au format PDF.

### Module de Quiz Interactif
Création de questionnaires personnalisables (nombre de questions, difficulté Facile/Moyen/Difficile) avec quatre formats :
- **QCM** : choix multiple
- **Vrai / Faux** : deux choix
- **Question ouverte** : réponse en texte libre
- **Mixte** : combinaison des trois types dans un même quiz

Correction automatique instantanée avec calcul du score. Limite de **20 quiz maximum par compte** avec message d'alerte dès la limite atteinte.

### Navigation des pages quiz
- Quiz **non joué** : bouton "Commencer le quiz" animé (scale + glow au survol).
- Quiz **déjà joué** : boutons "Voir le quiz" et "Rejouer" avec affichage du dernier score.
- Titre du document mis en valeur : gradient de couleur, taille majorée (1.4–1.6×), animation fade-in + slide à l'ouverture.

### Dashboard de Progression
Visualisation des statistiques globales (quiz complétés, score moyen, série actuelle, niveau). Graphique de progression sur les 7 derniers jours. Benchmark anonymisé vs les autres utilisateurs avec score projeté pour la prochaine session.

### Système de Maîtrise des Concepts
Indicateur de compréhension attribué à chaque document en fonction des résultats aux quiz successifs, calculé avec un algorithme pondéré (70% ancien score + 30% score récent). Affichage des documents les plus faibles.

### Gamification et Engagement
- **Streaks** : suivi du nombre de jours consécutifs d'utilisation.
- **Badges** : trophées débloqués automatiquement (Premier quiz, Série de 3, Parfait, Expert).
- **Système XP et Niveaux** : gain d'XP par quiz (bonus streak et score parfait), montée de niveau tous les 100 XP.
- **Échelle de niveaux** : visualisation horizontale des 10 niveaux (Novice → Apprenti → … → Dieu), niveau actuel illuminé avec animation.
- **Heatmap des faiblesses par thème** : grille colorée (vert = fort, jaune = moyen, orange = faible, rouge = critique) avec barres de progression animées.
- **Défis quotidiens** : 1 à 3 défis par jour avec suivi de progression et récompenses (XP, badges). Case cochable avec animation de validation.
- **Récompenses cosmétiques** : avatars, badges, thèmes UI, bordures — débloqués en progressant, affichés dans une grille avec animation de déblocage.

### Spaced Repetition System (SRS)
Réactivation automatique des concepts oubliés selon l'algorithme SM-2 (intervalles croissants comme Anki). Section "Documents à réviser" dans le dashboard avec bouton de validation.

### Analyse IA des Faiblesses
Analyse des erreurs récentes via Gemini pour générer des conseils personnalisés et ciblés sur les points non maîtrisés.

### Quiz Culture Générale
Section dédiée avec une grille de 12 thèmes (Géographie, Sport, Histoire, Sciences, Musique, Cinéma, Art, Technologie, Gastronomie, Nature, Astronomie, Philosophie). Chaque thème propose un mini-quiz indépendant. Animation au survol (zoom + rotation de l'icône). Les scores sont destinés à alimenter un classement en temps réel.

### Système d'Amis
- **Icône amis dans le header** avec badge de notification indigo indiquant le nombre de demandes en attente.
- **Panneau amis** (dropdown header) : onglet « Demandes » (accepter / refuser) + onglet « Amis » (liste avec niveau, score, bouton Défier).
- Ajout d'amis par **pseudo** ou par **email** dans la section dédiée.
- Liste des amis avec niveau et score moyen ; animation slide-in à l'ajout.
- **Configuration d'un duel** : choix du nombre de manches (3 / 5 / 7 / 10), sélection des rubriques (thèmes), timer par question (10 / 20 / 30 secondes).
- **Timer par question** : compte à rebours SVG circulaire — passe au rouge à ≤ 5 s. Si le temps est écoulé, la question est automatiquement marquée comme échouée.
- **Réactions emoji en temps réel** : pendant un duel, chaque joueur peut envoyer un emoji (🔥 😅 💪…) visible à l'écran adverse via une animation flottante.
- **Écran de résultat** : tableau manche par manche avec scores, et proclamation du vainqueur.

### Notifications Web Push (OneSignal)
- **Toasts in-app** : système d'événements `boileau:notify` affiché en bas-droite (AnimatePresence), types : `friend_request` (indigo), `challenge` (rose), `info` (gris). Auto-disparition 5 s, fermeture manuelle.
- **SDK OneSignal** (`react-onesignal` v3) : initialisation dans `App.js` via `REACT_APP_ONESIGNAL_APP_ID`. Service Worker `public/OneSignalSDKWorker.js` requis (pointe vers le CDN OneSignal v16).
- **Activation push** : bouton cloche dans le header et dans le dropdown profil — appelle `OneSignal.Notifications.requestPermission()` puis `User.PushSubscription.optIn()`. Cloche verte = activé.
- Les souscriptions sont gérées par OneSignal (dashboard + REST API) ; le player ID peut être envoyé au backend via `POST /api/push/register-player/` pour des envois ciblés par utilisateur.
- Notifications déclenchées pour : demandes d'amis reçues, défis lancés, acceptation de duel.

### PWA
Application installable sur mobile et desktop via un manifeste Web App (thème sombre, couleur d'accent indigo).

---

## 2. Architecture Technique
- **Frontend** : React JS, Tailwind CSS, Framer Motion
- **Backend** : Django REST Framework, SimpleJWT
- **Base de données** : PostgreSQL (port 5433)
- **IA** : API Gemini (REST v1beta) pour résumés, quiz et analyse des faiblesses
- **Extraction PDF** : pypdf 6.10.2

---

## 3. Ce qui reste à implémenter (backend non encore fait)

- Sound effects (sons UI : clic, correct, level-up, récompense…) — à connecter une fois l'administration définie
- Classement en temps réel (WebSockets) pour les parties solo et les duels amis (les émojis adverses sont actuellement simulés côté client)
- API backend pour le système d'amis :
  - `GET /api/friends/` — liste des amis
  - `GET /api/friends/requests/` — demandes reçues
  - `POST /api/friends/request/` — envoyer une demande
  - `POST /api/friends/requests/{id}/accept/` — accepter
  - `POST /api/friends/requests/{id}/decline/` — refuser
  - `DELETE /api/friends/{id}/` — supprimer un ami
- API backend pour les duels : `POST /api/challenges/duel/`, `GET /api/challenges/`, `POST /api/challenges/{id}/accept/`
- API backend pour la culture générale (`/api/culture/themes/`, `/api/culture/questions/`, `/api/culture/submit/`)
- **OneSignal App ID** à configurer dans `.env` (`REACT_APP_ONESIGNAL_APP_ID`) + endpoint backend `POST /api/push/register-player/` pour lier le player ID OneSignal à l'utilisateur Django et envoyer des push ciblés via l'API REST OneSignal
- Données réelles pour les défis quotidiens et les récompenses cosmétiques (remplacent les mocks actuels)
- Cron job quotidien pour streaks/XP
- Export progression certifiable (PDF avec QR vérifiable)
- Tests E2E (Cypress)
