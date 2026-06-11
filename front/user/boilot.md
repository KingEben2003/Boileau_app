# Boileau — Plateforme d'apprentissage intelligente

## Présentation générale

**Boileau** est une application web full-stack orientée apprentissage, conçue pour aider étudiants et professionnels à extraire, comprendre et mémoriser la connaissance contenue dans leurs documents PDF. L'application combine l'intelligence artificielle (Google Gemini), la gamification et des mécanismes de répétition espacée pour transformer l'étude passive en expérience interactive et engageante.

**Stack technique :**
| Couche | Technologies |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS 3.4, Framer Motion 12 |
| Backend | Django 6.0.2, Django REST Framework 3.16.1, PostgreSQL (port 5433) |
| Auth | SimpleJWT (access 2h / refresh 7j), Google OAuth 2.0 (token vérifié server-side) |
| IA | Google Gemini API (v1beta, modèle `gemini-2.5-flash`) |
| PDF | jsPDF 4.2, pdfjs-dist 5.4, pypdf (extraction backend) |
| Notifications | OneSignal Web Push + toasts in-app |
| HTTP | Axios 1.13 avec intercepteur JWT auto-refresh sur 401 |

---

## Fonctionnalités implémentées

### 1. Authentification & Gestion des utilisateurs

- Connexion email/mot de passe avec option "Se souvenir de moi"
- Connexion via Google OAuth 2.0 — le token Google est **vérifié côté serveur** via `googleapis.com/oauth2/v3/tokeninfo` (aucune usurpation possible)
- Inscription avec username auto-généré depuis l'email
- **Flux complet de réinitialisation de mot de passe :**
  1. Saisie de l'email → code à 6 chiffres envoyé par email (SMTP Gmail)
  2. Saisie du code (expiration 10 min, coller depuis le presse-papiers supporté)
  3. Choix du nouveau mot de passe avec toggle de visibilité
- Déconnexion sécurisée avec nettoyage des tokens (localStorage + sessionStorage)
- Routes protégées : redirection automatique vers `/login` si non authentifié
- Rafraîchissement automatique du JWT sur erreur 401 avec file d'attente des requêtes
- Page de profil : avatar, email, date d'inscription, statistiques XP/niveau/streak/badges

---

### 2. Gestion des PDFs

- Zone de dépôt (drag-and-drop) avec validation de type fichier et taille
- Barre de progression animée pendant l'upload
- Extraction automatique du texte via pypdf côté backend
- Bouton de ré-extraction pour les documents problématiques
- Historique des documents dans la barre latérale (rafraîchissement par événement `documents:refresh`)
- Suppression de documents avec confirmation
- Métadonnées affichées : titre, date de création, longueur du texte extrait

---

### 3. Génération de résumés (IA)

- Trois niveaux de résumé :
  - **Bref** — points clés uniquement (~2-3 min)
  - **Moyen** — aperçu structuré (~5-7 min)
  - **Détaillé** — analyse approfondie (~15+ min)
- Effet machine à écrire (typewriter) pour l'affichage progressif
- Rendu Markdown stylisé (titres, listes, gras, etc.)
- Export PDF personnalisé via jsPDF : en-tête/pied de page, pagination, Markdown → blocs typographiques, palette Indigo
- Suggestions d'étude contextualisées selon le niveau
- Historique des résumés enregistrés par document

---

### 4. Système de quiz (interactif)

- Quatre formats de questions : QCM, Vrai/Faux, question ouverte, mixte
- Paramètres personnalisables : nombre de questions, difficulté (Facile / Moyen / Difficile), format
- Interface de jeu : barre de progression, navigation Précédent/Suivant, stockage des réponses en cours
- Correction automatique : score, chronomètre de session, récapitulatif avec relecture
- Soumission des résultats en base (`score`, `time_spent_seconds`, `answers_detail`)
- Mise à jour XP, niveau et streak à chaque quiz soumis
- Historique des tentatives avec scores

---

### 5. Tableau de bord Progression & Analytiques

- **Cartes de statistiques :** quiz complétés, score moyen, streak actuel, niveau XP — données réelles depuis l'API
- **Graphique 7 jours :** courbe de progression avec remplissage dégradé, tooltip au survol, référence de moyenne globale
- **Benchmark anonymisé :** moyenne globale tous utilisateurs, percentile de l'utilisateur, score projeté prochaine session
- **Système de niveaux (10 paliers) :**
  Novice → Apprenti → Explorateur → Adepte → Expert → Maître → Sage → Vétéran → Légende → Dieu
  Barre XP animée, 100 XP par niveau, échelle interactive
- **Carte de chaleur des faiblesses :** grille par **document** (données réelles de `mastery_levels`) colorée Vert/Jaune/Orange/Rouge, état vide si aucun quiz
- **Défis quotidiens :** calculés en temps réel depuis la base (quiz du jour, score ≥80 %, documents distincts révisés), récompenses XP et badge
- **Cosmétiques :** débloqués automatiquement selon les badges réels de l'utilisateur (`summary.badges`)
- **Répétition espacée (SRS) :** liste des documents à revoir selon l'algorithme SM-2, bouton "Révisé"
- **Analyse IA des faiblesses :** conseils personnalisés générés par Gemini sur les erreurs récentes
- **Documents les plus faibles :** top 3 depuis `AnalyticsDashboardView`

---

### 6. Système d'amis & Duels

**Gestion des amis (100 % connecté à l'API) :**
- Ajout par pseudo ou email → `POST /api/friends/request/`
- Envoi, réception, acceptation (`POST /api/friends/requests/{id}/accept/`) et refus de demandes
- Avatars lettre (initiale du username, couleur déterministe) — plus d'emojis statiques
- Liste d'amis chargée depuis `GET /api/friends/` avec niveau et score réels (depuis `UserStats`)
- Badge de notification sur les demandes en attente dans la Topbar (données API réelles)
- Squelette de chargement pendant le fetch initial

**Duels (moteur local) :**
- Configuration : manches (3/5/7/10), thèmes (8 catégories), minuterie (10/20/30 s)
- Minuterie circulaire SVG avec changement de couleur progressif (indigo → orange → rouge)
- Scoring manche par manche, simulation adversaire côté client
- Réactions emoji flottantes (envoi + simulation adversaire)
- Écran de résultats : tableau manche par manche, annonce vainqueur, rejouer

---

### 7. Culture Générale

- 12 catégories thématiques : Géographie · Sport · Histoire · Sciences · Musique · Cinéma · Art · Technologie · Gastronomie · Nature · Astronomie · Philosophie
- **48 questions** en base (4 par thème), servies par `GET /api/culture/questions/?theme=...`
- Mini-quiz QCM, correction instantanée, récapitulatif des réponses
- Soumission des résultats en base (`CultureResult`) via `POST /api/culture/submit/`
- Classement par thème via `GET /api/culture/leaderboard/`
- Grille de cartes thématiques avec dégradés, icônes, descriptions, effets au survol

---

### 8. Notifications & Engagement

- **Toasts in-app :** demande d'amitié (indigo), défi (rose), info (gris) — fermeture auto 5 s ou manuelle
- **Notifications push Web (OneSignal) :** icône cloche dans la Topbar (vert = activées / rose = désactivées), demande de permission, push pour demandes d'amitié, défis, montées de niveau
- Synchronisation du `player_id` OneSignal vers le backend (`POST /api/push/register-player/`)
- **PWA :** installable mobile/desktop, manifest.json, service worker OneSignal, thème sombre

---

## Sécurité

| Point | Implémentation |
|---|---|
| Secrets | Tous dans `DjangoAPI/.env` (jamais dans le code source) |
| Google OAuth | Token vérifié auprès de `googleapis.com/oauth2/v3/tokeninfo` + `email_verified` obligatoire |
| JWT | Access 2h, Refresh 7j, nettoyage complet à la déconnexion |
| Réinitialisation MDP | Code 6 chiffres, expiration 10 min, effacé après utilisation |
| `.gitignore` | `DjangoAPI/.env` et `boilot/.env` exclus du dépôt |
| Endpoints | `IsAuthenticated` par défaut, `AllowAny` uniquement sur login/register/public-config |
| Config frontend | Exposée via `GET /api/public-config/` (Google Client ID, OneSignal App ID) — plus de variables `REACT_APP_*` dans le frontend |

---

## Architecture du projet

```
Projet/
├── DjangoAPI/                   # Backend Django REST Framework
│   ├── .env                     # SEUL fichier de configuration (secrets + config frontend)
│   ├── APIBoileau/
│   │   ├── settings.py          # Lit .env via load_env_file()
│   │   └── urls.py
│   ├── users/                   # Auth, profil, Google OAuth, reset MDP, config publique
│   ├── documents/               # Upload, extraction PDF, gestion fichiers
│   ├── quizzes/                 # Génération Gemini, soumission, historique
│   ├── summaries/               # Génération Gemini, historique
│   ├── analytics/               # Résumé, progression, dashboard, défis quotidiens
│   ├── srs/                     # Répétition espacée (algorithme SM-2)
│   ├── friends/                 # Demandes d'amitié, challenges, duels
│   └── culture/                 # 12 thèmes, 48 questions, classements
│
└── boilot/                      # Frontend React
    ├── .env                     # Vide (config exposée par /api/public-config/)
    ├── public/                  # Assets statiques, manifest PWA, SW OneSignal
    └── src/
        ├── App.js               # Fetch config backend → GoogleOAuthProvider + OneSignal init
        ├── AuthContext.jsx      # Contexte global auth (login/logout/état)
        ├── components/
        │   ├── Login.jsx
        │   ├── layout/          # DashboardLayout, Sidebar, Topbar, Register,
        │   │                    # ForgotPassword, VerifyCode, ResetPassword
        │   ├── Sections/        # Upload, SummaryHistory, QuizPlayer, Progress,
        │   │                    # Friends, CultureGenerale, Profil
        │   └── ui/              # NotificationToast, composants réutilisables
        ├── services/
        │   └── api.js           # Client Axios + intercepteur JWT, toutes les fonctions API
        └── utils/
            ├── webPush.js       # Intégration OneSignal
            └── pdfExport.js     # Export Markdown → jsPDF
```

---

## Endpoints API (résumé)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/public-config/` | Google Client ID + OneSignal App ID (public) |
| POST | `/api/register/` | Inscription |
| POST | `/api/login/` | Connexion JWT |
| POST | `/api/google-login/` | Connexion Google (token vérifié) |
| GET | `/api/me/` | Profil utilisateur |
| POST | `/api/forgot-password/` | Envoi du code de réinitialisation |
| POST | `/api/verify-code/` | Vérification du code |
| POST | `/api/reset-password/` | Nouveau mot de passe |
| POST | `/api/push/register-player/` | Sync OneSignal player ID |
| GET/POST | `/api/documents/` | Liste / upload PDF |
| DELETE | `/api/documents/{id}/` | Suppression |
| POST | `/api/summaries/generate/` | Génération résumé Gemini |
| POST | `/api/quizzes/generate/` | Génération quiz Gemini |
| POST | `/api/quizzes/{id}/submit/` | Soumission résultats |
| GET | `/api/analytics/summary/` | Stats globales + badges + mastery |
| GET | `/api/analytics/dashboard/` | Benchmark, progression 7j, score projeté |
| GET | `/api/analytics/daily-challenges/` | Défis quotidiens calculés en temps réel |
| GET | `/api/ai/weaknesses/` | Analyse Gemini des faiblesses |
| GET/POST | `/api/srs/due/` `/api/srs/update/` | Révision espacée |
| GET | `/api/friends/` | Liste d'amis |
| POST | `/api/friends/request/` | Envoi demande |
| POST | `/api/friends/requests/{id}/accept/` | Accepter |
| POST | `/api/friends/requests/{id}/decline/` | Refuser |
| GET | `/api/culture/themes/` | 12 thèmes |
| GET | `/api/culture/questions/` | Questions par thème |
| POST | `/api/culture/submit/` | Soumission résultats |
| GET | `/api/culture/leaderboard/` | Classement |

---

## Configuration

**Un seul fichier à éditer : `DjangoAPI/.env`**

```env
SECRET_KEY=...
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...      # App Password Gmail (pas le mot de passe Google)
DEFAULT_FROM_EMAIL=...
GOOGLE_CLIENT_ID=...         # console.cloud.google.com
ONESIGNAL_APP_ID=...         # app.onesignal.com
GEMINI_API_KEY=...           # aistudio.google.com
```

Le frontend (`boilot/.env`) est intentionnellement vide — `App.js` charge la configuration au démarrage depuis `GET /api/public-config/`.

---

## État du projet

L'application est **fonctionnelle et production-ready** dans son ensemble. Il reste deux étapes avant de lancer :

1. **Migrations Django** (obligatoire) :
   ```bash
   python manage.py makemigrations users friends culture
   python manage.py migrate
   ```

2. **Google OAuth en production** (uniquement si déploiement) :
   Ajouter l'URL de production dans les *Authorized JavaScript origins* sur [console.cloud.google.com](https://console.cloud.google.com). En développement local (`http://localhost:3000`), aucune action requise.
