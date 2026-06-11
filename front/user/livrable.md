# Boileau — Guide d'administration complet

> Document de référence à usage interne. Couvre l'intégralité de l'application : fonctionnalités, flux utilisateurs, comportements UI, systèmes externes et procédures d'administration.

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture technique](#2-architecture-technique)
3. [Configuration et démarrage](#3-configuration-et-démarrage)
4. [Administration Django](#4-administration-django)
5. [Gestion de la base de données](#5-gestion-de-la-base-de-données)
6. [Authentification — détail complet](#6-authentification--détail-complet)
7. [Gestion des documents PDF](#7-gestion-des-documents-pdf)
8. [Résumés IA](#8-résumés-ia)
9. [Système de quiz](#9-système-de-quiz)
10. [Tableau de bord Progression](#10-tableau-de-bord-progression)
11. [Système d'amis et duels](#11-système-damis-et-duels)
12. [Culture Générale](#12-culture-générale)
13. [Notifications et engagement](#13-notifications-et-engagement)
14. [Interface utilisateur — comportements détaillés](#14-interface-utilisateur--comportements-détaillés)
15. [Effets sonores](#15-effets-sonores)
16. [Système JWT — cycle de vie](#16-système-jwt--cycle-de-vie)
17. [Intégration Google OAuth](#17-intégration-google-oauth)
18. [Intégration OneSignal Push](#18-intégration-onesignal-push)
19. [Intégration Google Gemini IA](#19-intégration-google-gemini-ia)
20. [Email SMTP Gmail](#20-email-smtp-gmail)
21. [Répétition espacée (SRS)](#21-répétition-espacée-srs)
22. [Endpoints API — référence complète](#22-endpoints-api--référence-complète)
23. [Procédures de maintenance](#23-procédures-de-maintenance)
24. [Sécurité](#24-sécurité)

---

## 1. Vue d'ensemble du projet

**Boileau** (nom interne : *boilot*) est une plateforme web d'apprentissage intelligente. Elle permet à un utilisateur de :

1. Déposer ses propres documents PDF
2. Obtenir des résumés générés par IA (Google Gemini)
3. S'entraîner avec des quiz générés automatiquement depuis les PDF
4. Suivre sa progression via des graphiques, un système de niveaux XP et des défis quotidiens
5. Se mesurer à des amis dans des duels de culture générale
6. Tester ses connaissances sur 12 thèmes de culture générale

L'application est **full-stack** :
- **Backend** : Django REST Framework, Python, PostgreSQL
- **Frontend** : React 19, Tailwind CSS, Framer Motion

Il n'existe **qu'un seul fichier de configuration** à gérer : `DjangoAPI/.env`.

---

## 2. Architecture technique

```
Projet/
├── DjangoAPI/                    ← Backend Python/Django
│   ├── .env                      ← SEUL fichier de config (tous les secrets)
│   ├── APIBoileau/
│   │   ├── settings.py           ← Lit .env via load_env_file()
│   │   └── urls.py               ← Routage principal
│   ├── users/                    ← Auth, profil, OAuth, reset MDP, config publique
│   ├── documents/                ← Upload PDF, extraction texte
│   ├── quizzes/                  ← Génération quiz Gemini, soumission, historique
│   ├── summaries/                ← Génération résumés Gemini, historique
│   ├── analytics/                ← Stats, progression, défis, analyse IA
│   ├── srs/                      ← Répétition espacée (algorithme SM-2)
│   ├── friends/                  ← Amis, demandes, challenges
│   └── culture/                  ← 12 thèmes, 48 questions, classements
│
└── boilot/                       ← Frontend React
    ├── .env                      ← Intentionnellement vide
    ├── public/                   ← Assets statiques, manifest PWA, SW OneSignal
    └── src/
        ├── App.js                ← Racine : charge config backend → init providers
        ├── AuthContext.jsx       ← État global authentification
        ├── components/
        │   ├── Login.jsx
        │   ├── layout/           ← DashboardLayout, Sidebar, Topbar, Register,
        │   │                        ForgotPassword, VerifyCode, ResetPassword
        │   ├── Sections/         ← Upload, SummaryHistory, QuizPlayer, Progress,
        │   │                        Friends, CultureGenerale, Profil
        │   └── ui/               ← NotificationToast, composants réutilisables
        ├── services/
        │   └── api.js            ← Client Axios + intercepteur JWT auto-refresh
        └── utils/
            ├── webPush.js        ← Intégration OneSignal
            └── pdfExport.js      ← Export Markdown → jsPDF
```

### Stack technique détaillé

| Couche | Technologies | Version |
|---|---|---|
| Frontend UI | React | 19 |
| Routing | React Router | v7 |
| CSS | Tailwind CSS | 3.4 |
| Animations | Framer Motion | 12 |
| HTTP client | Axios | 1.13 |
| PDF export | jsPDF | 4.2 |
| PDF lecture | pdfjs-dist | 5.4 |
| Auth Google (frontend) | @react-oauth/google | — |
| Push notifications | react-onesignal | — |
| Backend framework | Django | 6.0.2 |
| API REST | Django REST Framework | 3.16.1 |
| Auth JWT | SimpleJWT | — |
| Base de données | PostgreSQL | port 5433 |
| PDF extraction | pypdf | — |
| IA | Google Gemini API | v1beta, gemini-2.5-flash |
| Push (backend) | OneSignal REST API | — |
| Validation Google | googleapis.com/oauth2/v3/tokeninfo | — |

---

## 3. Configuration et démarrage

### 3.1 Fichier de configuration unique

**Emplacement** : `DjangoAPI/.env`

```env
SECRET_KEY=<clé Django secrète>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<adresse Gmail>
EMAIL_HOST_PASSWORD=<App Password Gmail — 16 caractères>
DEFAULT_FROM_EMAIL=Boilot <<adresse Gmail>>
GOOGLE_CLIENT_ID=<client ID depuis console.cloud.google.com>
ONESIGNAL_APP_ID=<App ID depuis app.onesignal.com>
GEMINI_API_KEY=<clé API depuis aistudio.google.com>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_SECONDS=90
GEMINI_SOURCE_MAX_CHARS=12000
```

> **Important** : Le fichier `boilot/.env` est **intentionnellement vide**. Le frontend récupère `GOOGLE_CLIENT_ID` et `ONESIGNAL_APP_ID` depuis l'endpoint Django `/api/public-config/` au démarrage.

### 3.2 Démarrage du backend

```bash
cd DjangoAPI
python manage.py migrate          # première fois ou après changement de modèles
python manage.py runserver        # démarre sur http://127.0.0.1:8000
```

### 3.3 Démarrage du frontend

```bash
cd boilot
npm install                       # première fois
npm start                         # démarre sur http://localhost:3000
```

### 3.4 Migrations obligatoires (première installation)

```bash
python manage.py makemigrations users friends culture
python manage.py migrate
```

### 3.5 Créer un superutilisateur Django

```bash
python manage.py createsuperuser
# Saisir : username, email, mot de passe
# Accès admin : http://127.0.0.1:8000/admin/
```

---

## 4. Administration Django

### 4.1 Interface Django Admin

URL : `http://127.0.0.1:8000/admin/`

Connexion avec le compte superutilisateur créé via `createsuperuser`.

### 4.2 Modèles administrables

#### `users` — Utilisateurs

| Modèle | Description |
|---|---|
| `User` | Modèle custom (hérite de AbstractUser). Champs : `username`, `email`, `onesignal_player_id` |
| `UserStats` | Statistiques liées à l'utilisateur : `xp`, `level`, `current_streak`, `badges` (JSON) |
| `PasswordResetCode` | Codes de réinitialisation MDP : `code` (6 chiffres), `created_at`, `is_used` |

**Actions admin courantes :**
- Voir / modifier un utilisateur : liste des utilisateurs → cliquer sur un nom
- Réinitialiser manuellement un mot de passe : depuis la page utilisateur Django Admin → bouton "Changer le mot de passe"
- Voir les stats XP d'un utilisateur : table `UserStats` filtrée par user
- Invalider un code de réinitialisation : mettre `is_used = True` dans `PasswordResetCode`

#### `documents` — Documents PDF

| Modèle | Description |
|---|---|
| `Document` | Champs : `user`, `title`, `file` (chemin fichier), `extracted_text`, `created_at` |

**Actions admin :**
- Voir les documents d'un utilisateur : filtrer par `user`
- Voir le texte extrait : champ `extracted_text` (peut être très long)
- Supprimer un document : le fichier physique est supprimé du disque si le signal `post_delete` est configuré

#### `quizzes` — Quiz

| Modèle | Description |
|---|---|
| `Quiz` | Champs : `document`, `user`, `questions` (JSON), `difficulty`, `format`, `created_at` |
| `Result` | Champs : `quiz`, `user`, `score`, `time_spent_seconds`, `answers_detail` (JSON), `date_passed` |

**Actions admin :**
- Voir les résultats d'un utilisateur
- Inspecter le détail des réponses (champ `answers_detail` JSON)
- Modifier manuellement un score (usage exceptionnel)

#### `summaries` — Résumés

| Modèle | Description |
|---|---|
| `Summary` | Champs : `document`, `user`, `level` (brief/medium/detailed), `content` (texte Markdown), `created_at` |

#### `analytics` — Analytiques

Pas de modèle propre — les vues calculent en temps réel depuis `Result` et `UserStats`.

#### `srs` — Répétition espacée

| Modèle | Description |
|---|---|
| `SRSCard` | Champs : `user`, `document`, `next_review`, `interval`, `repetitions`, `easiness_factor` |

**Actions admin :**
- Voir les cartes SRS d'un utilisateur et leur date de prochaine révision
- Réinitialiser une carte (remettre `repetitions=0`, `interval=1`)

#### `friends` — Amis

| Modèle | Description |
|---|---|
| `FriendRequest` | Champs : `from_user`, `to_user`, `status` (pending/accepted/declined), `sent_at` |

**Actions admin :**
- Voir les demandes en attente
- Forcer l'acceptation d'une demande : mettre `status = accepted`
- Supprimer une relation amicale problématique

#### `culture` — Culture Générale

| Modèle | Description |
|---|---|
| `CultureQuestion` | Champs : `theme`, `question`, `options` (JSON), `correct_answer`, `explanation` |
| `CultureResult` | Champs : `user`, `theme`, `score`, `total`, `created_at` |

**Actions admin :**
- Ajouter / modifier / supprimer des questions de culture générale directement depuis l'admin
- Voir les scores par thème et par utilisateur

### 4.3 Ajouter des questions de culture générale

1. Aller sur `http://127.0.0.1:8000/admin/culture/culturequestion/add/`
2. Remplir :
   - **theme** : un des 12 thèmes (voir section 12)
   - **question** : texte de la question
   - **options** : JSON array, ex. `["Paris", "Lyon", "Bordeaux", "Marseille"]`
   - **correct_answer** : index 0-based ou la réponse exacte (vérifier le serializer)
   - **explanation** : explication affichée après correction (optionnel)
3. Sauvegarder

---

## 5. Gestion de la base de données

### 5.1 Connexion PostgreSQL

| Paramètre | Valeur |
|---|---|
| Hôte | localhost |
| Port | 5433 |
| Base | Boileau_db |
| Utilisateur | configuré dans settings.py |

### 5.2 Commandes utiles

```bash
# Voir l'état des migrations
python manage.py showmigrations

# Créer les migrations après modification d'un modèle
python manage.py makemigrations <app_name>

# Appliquer les migrations
python manage.py migrate

# Accéder au shell Django (requêtes ORM interactives)
python manage.py shell

# Exemple dans le shell : voir les stats d'un utilisateur
from users.models import User, UserStats
u = User.objects.get(email="test@example.com")
stats = UserStats.objects.get(user=u)
print(stats.xp, stats.level, stats.current_streak)
```

### 5.3 Sauvegardes

```bash
# Dump complet de la base
python manage.py dumpdata --indent 2 > backup.json

# Restaurer depuis un dump
python manage.py loaddata backup.json
```

---

## 6. Authentification — détail complet

### 6.1 Flux de connexion email/mot de passe

1. L'utilisateur ouvre `/login`
2. Il saisit email + mot de passe
3. Option **"Se souvenir de moi"** (checkbox) :
   - Coché → token stocké dans `localStorage` (persiste après fermeture du navigateur)
   - Décoché → token stocké dans `sessionStorage` (effacé à la fermeture de l'onglet)
4. `POST /api/login/` → retourne `{ access, refresh, user: {...} }`
5. L'`AuthContext` stocke le token et met à jour l'état `user`
6. Redirection automatique vers le dashboard (`/`)

### 6.2 Flux d'inscription

1. L'utilisateur ouvre `/register`
2. Saisit email + mot de passe (+ confirmation)
3. `POST /api/register/` → le `username` est **auto-généré** depuis la partie locale de l'email (avant le `@`)
4. Si succès → redirection vers `/login` avec message de confirmation

### 6.3 Connexion Google OAuth 2.0

1. L'utilisateur clique sur "Se connecter avec Google" (bouton `@react-oauth/google`)
2. Le popup Google s'ouvre → l'utilisateur choisit son compte
3. Google retourne un **id_token** côté frontend
4. Le frontend envoie `POST /api/google-login/` avec `{ token: <id_token> }`
5. **Côté backend** (sécurisé) :
   - Le token est envoyé à `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=<token>`
   - Si `email_verified != true` → rejet 401
   - Si le token est invalide → rejet 401
   - Extraction de `email` depuis le payload Google
   - `get_or_create` de l'utilisateur par email
   - Retour de `{ access, refresh, user: {...} }`
6. Le frontend stocke les tokens et redirige vers le dashboard

> **Sécurité** : Le token Google n'est jamais utilisé directement sans vérification. La vérification server-side empêche toute usurpation d'identité.

### 6.4 Flux de réinitialisation de mot de passe

**Étape 1 — Saisie de l'email** (`/forgot-password`)
- `POST /api/forgot-password/` avec `{ email }`
- Backend génère un code à **6 chiffres aléatoires**, valide **10 minutes**
- Envoi par email via SMTP Gmail
- Redirection vers `/verify-code`

**Étape 2 — Saisie du code** (`/verify-code`)
- L'utilisateur entre le code reçu par email
- Support du **collage depuis le presse-papiers** (paste)
- `POST /api/verify-code/` avec `{ email, code }`
- Si le code est expiré ou déjà utilisé → erreur 400
- Si valide → redirection vers `/reset-password` avec l'email passé en paramètre

**Étape 3 — Nouveau mot de passe** (`/reset-password`)
- L'utilisateur saisit le nouveau mot de passe + confirmation
- Toggle de visibilité (icône œil)
- `POST /api/reset-password/` avec `{ email, code, new_password }`
- Le code est marqué `is_used = True` après utilisation (usage unique)
- Si succès → redirection vers `/login`

### 6.5 Déconnexion

1. L'utilisateur clique sur le bouton de déconnexion (dropdown profil → Topbar)
2. `AuthContext.logout()` :
   - Supprime `access_token` et `refresh_token` de `localStorage`
   - Supprime `access_token` et `refresh_token` de `sessionStorage`
   - Remet `user = null`
3. Redirection automatique vers `/login` (route protégée)

### 6.6 Routes protégées

Toutes les routes sous `/*` sont enveloppées dans `<ProtectedRoute>`.

```
/login          → public
/register       → public
/forgot-password → public
/verify-code    → public
/reset-password → public
/*              → ProtectedRoute → redirige vers /login si non authentifié
```

Si l'utilisateur tente d'accéder à une route protégée sans token → `<Navigate to="/login" />` immédiat.

Pendant le chargement initial de l'`AuthContext` (vérification du token) → affichage d'un spinner centré blanc sur fond noir.

---

## 7. Gestion des documents PDF

### 7.1 Zone de dépôt (Upload)

**Localisation** : Section "Upload" (icône nuage, premier item de la Sidebar)

**Comportements :**
- Zone de drag-and-drop avec bordure en pointillés indigo
- Au survol de la zone (hover) : la bordure passe en indigo vif + fond légèrement éclairci (transition Framer Motion)
- Au drop ou clic "Choisir un fichier" → ouverture du sélecteur de fichier natif
- **Validation** : seuls les fichiers `.pdf` sont acceptés (type `application/pdf`)
- **Limite de taille** : définie côté backend Django (vérifier `MAX_UPLOAD_SIZE` dans settings.py si configuré)

**Barre de progression :**
- Démarre à 0 %
- Monte par intervalles de 300 ms jusqu'à 85 % (simulation — la vraie progression réseau n'est pas trackée)
- Passe à 100 % dès que la réponse backend arrive avec succès
- Disparaît après 1 seconde à 100 %
- Animation : `transition-all duration-300` Tailwind

**Upload réel :**
- `POST /api/documents/` avec `FormData` contenant `file`
- Backend : `pypdf` extrait le texte du PDF automatiquement
- Après succès : dispatch de l'événement `documents:refresh` (événement DOM personnalisé)
- Tous les composants écoutant cet événement rechargent leur liste de documents

### 7.2 ModeToggle

En haut de la section Upload, deux boutons radio :
- **"Générer un résumé"** → sélectionner puis cliquer sur le document active la section Résumés
- **"Créer un quiz"** → sélectionner puis cliquer sur le document active la section Quiz

### 7.3 Historique des documents (Sidebar)

La Sidebar affiche la liste de tous les documents de l'utilisateur connecté.

- Chargée via `GET /api/documents/` au montage du `MainDashboard`
- Rafraîchie à chaque événement `documents:refresh`
- Affiche : titre du document, date de création, longueur du texte extrait
- Cliquer sur un document → le sélectionne (`selectedDocId`)

### 7.4 Suppression d'un document

- Bouton poubelle à côté de chaque document dans l'historique ou dans la section Profil
- Confirmation demandée via `window.confirm()` natif du navigateur
- `DELETE /api/documents/{id}/`
- Après succès : événement `documents:refresh` dispatché

### 7.5 Ré-extraction du texte

Pour les documents dont l'extraction a échoué ou est incomplète :
- Bouton "Ré-extraire" dans la vue document
- `POST /api/documents/{id}/reextract/` (si implémenté dans le backend)
- Relance `pypdf` sur le fichier déjà uploadé

---

## 8. Résumés IA

### 8.1 Génération d'un résumé

**Section** : "Résumés" (icône livre)

**Prérequis** : un document doit être sélectionné dans la Sidebar.

**Niveaux disponibles :**

| Niveau | Description | Temps approximatif |
|---|---|---|
| Bref | Points clés uniquement | ~2-3 min de lecture |
| Moyen | Aperçu structuré | ~5-7 min de lecture |
| Détaillé | Analyse approfondie | ~15+ min de lecture |

**Flux :**
1. L'utilisateur choisit un niveau (boutons radio stylisés)
2. Clic sur "Générer le résumé"
3. `POST /api/summaries/generate/` avec `{ document_id, level }`
4. **Côté backend** : Gemini reçoit le texte extrait (limité à `GEMINI_SOURCE_MAX_CHARS` = 12 000 chars) avec un prompt adapté au niveau choisi
5. La réponse Gemini est du **Markdown**
6. Le résumé est sauvegardé en base (`Summary`) lié au document et à l'utilisateur
7. Affichage avec **effet machine à écrire (typewriter)** : les caractères apparaissent un par un à vitesse fixe

### 8.2 Rendu Markdown

Le résumé est rendu avec un parser Markdown minimal intégré :
- `#`, `##`, `###` → titres avec tailles et couleurs différentes
- `**texte**` → gras
- `- item` → liste à puces
- Sauts de ligne → paragraphes

### 8.3 Export PDF

Bouton "Exporter en PDF" disponible une fois le résumé affiché.

**Ce que fait `pdfExport.js` :**
1. Parse le Markdown ligne par ligne
2. Applique une typographie différente selon le type de bloc (titre, paragraphe, liste)
3. Ajoute un **en-tête** (titre du document, date)
4. Ajoute un **pied de page** (pagination : "Page X / Y")
5. **Palette de couleurs** : indigo (`#6366F1` principal, `#4F46E5` secondaire)
6. Gestion automatique des **sauts de page** (débordement vertical)
7. Sauvegarde en fichier `.pdf` via `jsPDF.save()`

### 8.4 Suggestions d'étude

Sous chaque résumé, des suggestions contextuelles sont affichées selon le niveau :
- **Bref** : suggestion de lire le résumé moyen ou de faire un quiz rapide
- **Moyen** : suggestion de faire un quiz ou d'explorer le détaillé
- **Détaillé** : suggestion de faire un quiz difficile et d'activer la révision espacée

### 8.5 Historique des résumés

Chaque résumé généré est sauvegardé. L'utilisateur peut retrouver les anciens résumés via `GET /api/summaries/?document_id={id}`.

---

## 9. Système de quiz

### 9.1 Configuration du quiz

**Section** : "Quiz" (icône éclair)

**Prérequis** : un document doit être sélectionné.

**Paramètres personnalisables :**

| Paramètre | Options |
|---|---|
| Nombre de questions | 5, 10, 15, 20 |
| Difficulté | Facile, Moyen, Difficile |
| Format | QCM, Vrai/Faux, Question ouverte, Mixte |

**Génération :**
1. `POST /api/quizzes/generate/` avec `{ document_id, num_questions, difficulty, format }`
2. Gemini génère les questions en JSON structuré
3. Retour d'un objet `quiz` avec l'array `questions`
4. Transition vers l'interface de jeu

### 9.2 Interface de jeu

**Éléments visuels :**
- **Barre de progression** en haut : `(question actuelle / total) * 100%`, couleur indigo, animée
- **Numéro de question** : "Question X / Y"
- **Chronomètre de session** : démarre à 00:00, s'incrémente chaque seconde, affiché en haut à droite
- **Boutons Précédent / Suivant** : navigation entre les questions, les réponses déjà données sont mémorisées

**Par type de question :**

| Type | Interface |
|---|---|
| QCM | 4 boutons de choix (A/B/C/D), sélection au clic, couleur indigo quand sélectionné |
| Vrai/Faux | 2 boutons "Vrai" / "Faux" |
| Question ouverte | Zone de texte `<textarea>` |
| Mixte | Mélange des trois types ci-dessus selon la question |

Les réponses en cours sont stockées dans le state React local (`answers` array indexé par numéro de question).

### 9.3 Soumission et correction

1. À la dernière question → bouton "Terminer le quiz"
2. `POST /api/quizzes/{id}/submit/` avec `{ answers: [...], time_spent_seconds: <chrono> }`
3. **Backend calcule le score** : compare les réponses à `correct_answer` de chaque question
4. Mise à jour automatique :
   - `UserStats.xp` += points selon score
   - `UserStats.level` recalculé (100 XP par niveau)
   - `UserStats.current_streak` mis à jour
5. Retour : `{ score, correct_count, total, answers_detail, xp_gained }`

### 9.4 Écran de résultats

- Score en pourcentage (grand affichage central)
- Nombre de bonnes réponses / total
- Temps passé formaté (mm:ss)
- XP gagnés affichés avec animation
- **Récapitulatif question par question** :
  - Question correcte : fond vert + icône check
  - Question incorrecte : fond rouge + bonne réponse affichée
  - Question ouverte : réponse de l'utilisateur + réponse attendue
- Boutons : "Refaire un quiz" (retour config) / "Voir ma progression"

### 9.5 Historique des tentatives

`GET /api/quizzes/?document_id={id}` retourne la liste des quiz avec leurs résultats associés.

---

## 10. Tableau de bord Progression

**Section** : "Progression" (icône graphique)

### 10.1 Cartes de statistiques

4 cartes en haut du dashboard, données depuis `GET /api/analytics/summary/` :

| Carte | Données |
|---|---|
| Quiz complétés | `summary.total_quizzes` |
| Score moyen | `summary.average_score`% |
| Streak actuel | `summary.current_streak` jours |
| Niveau XP | `summary.level` + `summary.xp` |

### 10.2 Graphique 7 jours

- Courbe de progression des scores sur les 7 derniers jours
- **Remplissage dégradé** sous la courbe (indigo transparent)
- **Tooltip** au survol de chaque point : date + score
- **Ligne de référence** horizontale = moyenne globale de l'utilisateur
- Données depuis `GET /api/analytics/dashboard/`

### 10.3 Benchmark anonymisé

Depuis `GET /api/analytics/dashboard/` :
- **Moyenne globale** : score moyen de tous les utilisateurs
- **Percentile** de l'utilisateur : "Vous êtes meilleur que X% des utilisateurs"
- **Score projeté** pour la prochaine session (calcul simple basé sur la tendance récente)

### 10.4 Système de niveaux

**10 paliers** (100 XP par niveau) :

| Niveau | Nom |
|---|---|
| 1 | Novice |
| 2 | Apprenti |
| 3 | Explorateur |
| 4 | Adepte |
| 5 | Expert |
| 6 | Maître |
| 7 | Sage |
| 8 | Vétéran |
| 9 | Légende |
| 10 | Dieu |

**Barre XP** :
- Animée avec Framer Motion (montée progressive de 0 → valeur réelle au montage)
- Couleur indigo
- Affiche "X / 100 XP" avec le niveau actuel et le niveau suivant

**Échelle interactive** : cliquer sur un palier affiche son nom et les XP requis.

### 10.5 Carte de chaleur des faiblesses

- **Grille par document** : chaque document a une cellule colorée selon le niveau de maîtrise
- Données depuis `summary.mastery_levels` (array d'objets `{ title, mastery }`)
- `title` est un chemin complet (ex. `documents/uploads/fichier.pdf`) → extraction du nom de fichier seul
- Couleurs selon le score moyen :

| Score | Couleur |
|---|---|
| ≥ 80% | Vert |
| 60-79% | Jaune |
| 40-59% | Orange |
| < 40% | Rouge |

- **État vide** : si aucun quiz complété → message "Aucun document analysé — faites des quiz pour voir vos résultats ici."

### 10.6 Défis quotidiens

Depuis `GET /api/analytics/daily-challenges/` (calculé en temps réel chaque jour) :

| Défi | Cible | Récompense |
|---|---|---|
| Faire 3 quiz | 3 quiz aujourd'hui | 50 XP |
| Obtenir 80%+ sur un quiz | 1 quiz ≥ 80% aujourd'hui | 30 XP |
| Réviser 2 documents | 2 documents distincts aujourd'hui | Badge Assidu |

Chaque défi affiche :
- Barre de progression (valeur actuelle / cible)
- Récompense
- État : "Complété ✓" ou "En cours"

### 10.7 Cosmétiques

**Catalogue statique** de cosmétiques (avatars, bordures, thèmes) débloqués selon les badges réels de l'utilisateur (`summary.badges`).

Logique de déverrouillage : pour chaque cosmétique, son `badgeKey` est recherché dans `summary.badges` (comparaison insensible à la casse).

Les cosmétiques non débloqués sont affichés en grisé avec un cadenas.

### 10.8 Répétition espacée (SRS)

Depuis `GET /api/srs/due/` :
- Liste des documents dont la date de prochaine révision (`next_review`) est passée
- Ordonnée par urgence (plus en retard en premier)
- Bouton "Marquer comme révisé" → `POST /api/srs/update/` → recalcul SM-2 (intervalle, facteur de facilité)

### 10.9 Analyse IA des faiblesses

Depuis `GET /api/ai/weaknesses/` :
- Gemini analyse les erreurs récentes de l'utilisateur (les questions ratées des derniers quiz)
- Retourne des conseils personnalisés en texte libre
- Affichage dans une carte dédiée avec icône robot
- Le texte est rendu tel quel (pas de Markdown)

### 10.10 Documents les plus faibles

Top 3 des documents avec le plus faible taux de maîtrise, depuis `GET /api/analytics/dashboard/`.

Affichés avec nom, score moyen, et lien direct vers le quiz de ce document.

---

## 11. Système d'amis et duels

### 11.1 Gestion des amis

**Section** : "Amis" (icône personnes)

#### Ajouter un ami

1. Champ de recherche : saisir le **pseudo (username)** ou l'**email** d'un utilisateur
2. Clic "Envoyer la demande"
3. `POST /api/friends/request/` avec `{ to_user: <username_or_email> }`
4. Toast de confirmation affiché

#### Demandes reçues

- Onglet "Demandes" dans la section amis
- Chargé depuis `GET /api/friends/requests/` (filtre `status=pending`, `to_user=moi`)
- Affiche : **avatar lettre** + username de l'expéditeur + date
- Boutons : **Accepter** → `POST /api/friends/requests/{id}/accept/` / **Refuser** → `POST /api/friends/requests/{id}/decline/`

#### Liste d'amis

- Depuis `GET /api/friends/`
- Chaque ami affiche : **avatar lettre**, username, niveau, score moyen
- Bouton "Défier" → ouvre la configuration du duel avec cet ami pré-sélectionné

#### Avatar lettre

Les avatars sont des cercles avec l'**initiale du username** en blanc sur fond gradient.

5 gradients déterministes basés sur `username.charCodeAt(0) % 5` :

| Index | Gradient |
|---|---|
| 0 | Indigo → Violet (`#6366F1` → `#8B5CF6`) |
| 1 | Cyan → Bleu (`#06B6D4` → `#3B82F6`) |
| 2 | Rose → Orange (`#F43F5E` → `#F97316`) |
| 3 | Emeraude → Teal (`#10B981` → `#14B8A6`) |
| 4 | Ambre → Jaune (`#F59E0B` → `#EAB308`) |

Le même utilisateur aura toujours le même gradient, quelle que soit la session ou le navigateur.

#### Badge notification

La **Topbar** affiche un badge rouge sur l'icône amis avec le nombre de demandes en attente.

Chargé depuis `GET /api/friends/requests/` au montage de la Topbar, puis toutes les 60 secondes (polling).

### 11.2 Duels

Les duels se jouent **localement côté client** (l'adversaire est simulé).

#### Configuration du duel

| Paramètre | Options |
|---|---|
| Manches | 3, 5, 7, 10 |
| Thème | 8 catégories (Sciences, Histoire, Géographie, Sport, Technologie, Musique, Cinéma, Art) |
| Minuterie | 10, 20, 30 secondes par manche |

#### Interface de jeu

**Minuterie circulaire SVG :**
- Cercle SVG qui se vide progressivement (arc animé)
- Couleurs selon le temps restant :
  - > 60% → indigo
  - 30-60% → orange
  - < 30% → rouge

**Scoring :**
- 1 point par bonne réponse, 0 sinon
- L'adversaire répond après un délai aléatoire (simulation)
- Scores mis à jour manche par manche en temps réel

**Réactions emoji flottantes :**
- Boutons pour envoyer des réactions (👏, 😅, 🔥, etc.)
- Les emojis s'affichent en flottant et disparaissent en fondu
- L'adversaire simule aussi des réactions à intervalles aléatoires

#### Écran de résultats

- **Tableau manche par manche** : score joueur vs adversaire par manche
- **Annonce du vainqueur** : animation Framer Motion (scale + opacité)
- Bouton "Rejouer" → retour à la configuration
- Bouton "Retour aux amis"

---

## 12. Culture Générale

**Section** : "Culture" (icône globe)

### 12.1 Les 12 thèmes

| Icône | Thème |
|---|---|
| 🌍 | Géographie |
| ⚽ | Sport |
| 📜 | Histoire |
| 🔬 | Sciences |
| 🎵 | Musique |
| 🎬 | Cinéma |
| 🎨 | Art |
| 💻 | Technologie |
| 🍽️ | Gastronomie |
| 🌿 | Nature |
| 🌠 | Astronomie |
| 📚 | Philosophie |

### 12.2 Grille de cartes thématiques

- 12 cartes affichées en grille (responsive : 2 colonnes mobile, 3-4 desktop)
- Chaque carte : fond gradient unique par thème, icône, titre, description courte
- **Effet au survol** : scale légère (`transform: scale(1.03)`) + ombre portée indigo — Framer Motion `whileHover`

### 12.3 Mini-quiz par thème

1. Clic sur une carte → chargement des questions via `GET /api/culture/questions/?theme=<theme>`
2. 4 questions QCM par thème (48 questions au total en base)
3. **Correction instantanée** : après chaque réponse, la bonne réponse s'affiche en vert, la mauvaise en rouge
4. Après la dernière question → écran de récapitulatif

### 12.4 Récapitulatif

- Score : X / 4
- Chaque question listée avec : texte, réponse donnée, bonne réponse, explication (si renseignée en base)

### 12.5 Soumission des résultats

`POST /api/culture/submit/` avec `{ theme, score, total }` → sauvegardé en `CultureResult`

### 12.6 Classement par thème

`GET /api/culture/leaderboard/?theme=<theme>` → top 10 des scores par thème.

Accessible depuis un bouton "Classement" dans la vue thème.

---

## 13. Notifications et engagement

### 13.1 Toasts in-app

**Composant** : `NotificationToast` (rendu dans `App.js` au niveau racine, hors du layout)

**Déclenchement** : événement DOM personnalisé `boileau:notify` dispatché depuis `webPush.js`.

**3 types de toast :**

| Type | Couleur | Cas d'usage |
|---|---|---|
| `friend_request` | Indigo (`bg-indigo-900/80`) | Nouvelle demande d'amitié reçue |
| `challenge` | Rose (`bg-pink-900/80`) | Défi reçu d'un ami |
| `info` | Gris foncé (`bg-gray-800/80`) | Information générale |

**Comportement :**
- Apparaît en **bas à droite** de l'écran (position fixe)
- Animation Framer Motion : slide depuis la droite (`x: 400 → 0`) + opacité (`0 → 1`)
- **Disparition automatique** après **5 000 ms** (5 secondes)
- Bouton × pour fermer manuellement
- **Empilement** : plusieurs toasts peuvent être affichés simultanément (liste, scroll vertical)

### 13.2 Notifications push Web (OneSignal)

**Icône cloche** dans la Topbar :
- **Vert** = notifications activées
- **Rose** = notifications désactivées

**Clic sur la cloche :**
- Si désactivées → `OneSignal.showSlidedownPrompt()` : demande de permission navigateur
- Si activées → affichage d'un menu avec option "Désactiver"

**Types de notifications push envoyées :**
- Nouvelle demande d'amitié
- Défi d'un ami
- Montée de niveau

**Synchronisation** : à la connexion, le `player_id` OneSignal est envoyé au backend via `POST /api/push/register-player/` et stocké dans `User.onesignal_player_id`. Le backend peut ainsi cibler des utilisateurs spécifiques.

**OneSignal Dashboard** (pour l'admin) :
- URL : `https://app.onesignal.com`
- Voir les abonnés actifs
- Envoyer des notifications manuelles à tous les utilisateurs ou cibler des segments
- Voir les statistiques d'ouverture / clic

### 13.3 PWA (Progressive Web App)

L'application est **installable** sur mobile et desktop :
- `manifest.json` dans `boilot/public/` : icône, nom, couleur de thème (sombre)
- Service worker OneSignal géré automatiquement
- Sur mobile Chrome/Safari : "Ajouter à l'écran d'accueil"
- Sur desktop Chrome : icône d'installation dans la barre d'adresse

---

## 14. Interface utilisateur — comportements détaillés

### 14.1 Layout général

**Structure** :
```
+--Topbar (fixe, 64px de haut)------+
|  Logo | Search | Amis | Cloche | Profil |
+----+-------------------------------+
| S  |                               |
| I  |   Contenu principal           |
| D  |   (max-width 6xl, centré)     |
| E  |                               |
| B  |                               |
| A  |                               |
| R  |                               |
+----+-------------------------------+
```

### 14.2 Sidebar

**Largeur** : redimensionnable par drag (min 200px, max 400px)

- **Poignée de resize** : barre verticale fine à droite de la Sidebar, curseur `col-resize`
- La largeur est sauvegardée dans `localStorage` (`sidebar_width`)

**7 items de navigation :**

| Icône | Label | Section |
|---|---|---|
| ☁️ | Upload | upload |
| 📖 | Résumés | summaries |
| ⚡ | Quiz | quizzes |
| 📊 | Progression | progress |
| 👥 | Amis | amis |
| 🌐 | Culture | culture |
| 👤 | Profil | profil |

- Item actif : fond indigo + texte blanc + icône colorée
- Item inactif : texte gris + hover fond gris sombre
- Transitions Framer Motion sur le changement de section actuelle

**Historique des documents :**
- Sous les items de nav, liste des documents uploadés
- Affiche titre tronqué + date relative ("il y a 2 heures")
- Document sélectionné : fond indigo clair

**Mobile :**
- La Sidebar est masquée par défaut
- Un bouton hamburger dans la Topbar ouvre un overlay (fond noir semi-transparent)
- Fermeture en cliquant hors de la Sidebar

### 14.3 Topbar

**Barre de recherche :**
- Visuelle uniquement — aucune fonctionnalité de recherche implémentée
- Placeholder "Rechercher..." — prévu pour une future version
- Focusable au clavier mais ne déclenche aucune action

**Panel amis (dans la Topbar) :**
- Clic icône amis → panel latéral droit en slide-in
- 2 onglets : "Amis" / "Demandes"
- Même contenu que la section Amis complète, mais en format compact

**Profil dropdown :**
- Clic sur l'avatar en haut à droite
- Menu déroulant : "Mon profil", "Déconnexion"
- Fermeture en cliquant ailleurs (event listener `mousedown` global)

### 14.4 Design system

**Palette de couleurs :**
- Fond principal : `#030712` (noir quasi-total)
- Fond secondaire : gris très sombre (`gray-900`, `gray-800`)
- Accent : indigo (`indigo-500` = `#6366F1`, `indigo-600` = `#4F46E5`)
- Texte principal : blanc
- Texte secondaire : `gray-400`
- Succès : vert (`green-500`)
- Erreur : rouge (`red-500`)
- Avertissement : jaune/orange

**Classes CSS personnalisées :**
- `.glass-panel` : fond verre (backdrop-blur + bg semi-transparent)
- `.glass-card` : même effet, variante carte
- `.aurora-bg` : fond avec effet aurora (dégradés animés en arrière-plan)
- `.shimmer` : effet de brillance pour les états de chargement

**Animations Framer Motion :**
- Transitions entre sections : `fade + slide (x: -20 → 0)`
- Cartes : `scale` au hover (`whileHover: { scale: 1.02 }`)
- Modals : `scale: 0.95 → 1` + `opacity: 0 → 1`
- Listes : stagger children (chaque item décalé de 50ms)
- Barre de progression XP : montée depuis 0 via `animate` au montage

### 14.5 Squelettes de chargement (Skeleton UI)

Pendant les fetches API, les composants affichent des **rectangles animés** (`shimmer`) à la place du contenu :
- Friends.jsx : 3 lignes d'amis squelette
- Progress.jsx : cartes de stats squelette
- Listes de documents : lignes squelette

### 14.6 Gestion des erreurs UI

- Si une API retourne une erreur → toast `info` avec le message d'erreur
- Si le réseau est coupé → le toast affiche "Erreur réseau"
- Les formulaires affichent les erreurs inline sous les champs (texte rouge, `text-red-400`)

---

## 15. Effets sonores

**L'application Boileau ne comporte aucun effet sonore.**

Après inspection complète de l'ensemble du code source (frontend et backend), **aucun fichier audio** (`.mp3`, `.wav`, `.ogg`, etc.) et **aucune API Web Audio** (`AudioContext`, `HTMLAudioElement`, `new Audio()`) ne sont utilisés.

Tous les retours d'interaction sont **purement visuels** :
- Changements de couleur (boutons, bordures)
- Animations Framer Motion (scale, fade, slide)
- Toasts de notification (apparition/disparition animée)
- Barres de progression animées
- États de survol (hover) avec transitions CSS

**Si des effets sonores doivent être ajoutés ultérieurement**, les points d'intégration naturels seraient :
- Bonne réponse quiz : son court positif
- Mauvaise réponse : son court négatif
- Montée de niveau : son de fanfare
- Fin de timer duel : son d'alarme
- Upload réussi : son de confirmation

---

## 16. Système JWT — cycle de vie

### 16.1 Tokens

| Token | Durée | Stockage |
|---|---|---|
| Access token | 2 heures | localStorage ou sessionStorage |
| Refresh token | 7 jours | localStorage ou sessionStorage |

Le choix du stockage dépend de l'option **"Se souvenir de moi"** à la connexion.

### 16.2 Auto-refresh sur erreur 401

L'intercepteur Axios dans `api.js` gère automatiquement le rafraîchissement :

1. Une requête retourne **401**
2. L'intercepteur met la requête en attente dans une **file d'attente**
3. Envoie `POST /api/token/refresh/` avec `{ refresh: <refresh_token> }`
4. Si succès → nouveau `access_token` stocké → toutes les requêtes en attente relancées
5. Si le refresh échoue (refresh expiré) → déconnexion forcée → redirection `/login`

### 16.3 Headers

Chaque requête authentifiée envoie automatiquement :
```
Authorization: Bearer <access_token>
```

### 16.4 Déconnexion propre

À la déconnexion, l'`AuthContext` supprime :
- `localStorage.removeItem('access_token')`
- `localStorage.removeItem('refresh_token')`
- `sessionStorage.removeItem('access_token')`
- `sessionStorage.removeItem('refresh_token')`

Les tokens ne sont pas révoqués côté serveur (SimpleJWT sans blacklist). Un token access valide peut être utilisé jusqu'à expiration. C'est acceptable car la durée est courte (2h).

---

## 17. Intégration Google OAuth

### 17.1 Configuration requise

**Console Google Cloud** : `https://console.cloud.google.com`

1. Créer un projet (ou utiliser un existant)
2. APIs & Services → Identifiants → Créer des identifiants → ID client OAuth 2.0
3. Type d'application : **Application Web**
4. **Origines JavaScript autorisées** :
   - `http://localhost:3000` (développement local)
   - `https://votre-domaine.com` (production — à ajouter avant déploiement)
5. Copier le **Client ID** → le mettre dans `DjangoAPI/.env` → `GOOGLE_CLIENT_ID=...`

### 17.2 Flux côté frontend

- `<GoogleOAuthProvider clientId={appConfig.google_client_id}>` enveloppe toute l'app
- Le `clientId` est chargé dynamiquement depuis `/api/public-config/`
- `useGoogleLogin()` de `@react-oauth/google` gère le popup et retourne l'`id_token`

### 17.3 Vérification côté backend

`GoogleLoginView.post()` dans `users/views.py` :

```python
resp = requests.get(
    "https://www.googleapis.com/oauth2/v3/tokeninfo",
    params={"id_token": token}, timeout=10
)
# Vérifie : status 200, email_verified == "true"
# Extrait : email, name
# get_or_create User par email
# Retourne JWT
```

**Aucune bibliothèque tierce** n'est utilisée pour la vérification Google — uniquement l'endpoint public de Google.

---

## 18. Intégration OneSignal Push

### 18.1 Configuration requise

1. Créer un compte sur `https://app.onesignal.com`
2. Créer une nouvelle application Web
3. Copier l'**App ID** → `ONESIGNAL_APP_ID` dans `DjangoAPI/.env`
4. Télécharger les **Service Worker files** fournis par OneSignal et les placer dans `boilot/public/`

### 18.2 Initialisation frontend

Dans `App.js`, après le chargement de la config :

```javascript
OneSignal.init({
  appId: appConfig.onesignal_app_id,
  allowLocalhostAsSecureOrigin: true,       // permet localhost en HTTPS simulé
  welcomeNotification: { disable: true },   // pas de notif de bienvenue
});
```

### 18.3 Synchronisation du player_id

À l'activation des notifications par l'utilisateur, `webPush.js` :
1. Récupère le `player_id` OneSignal
2. `POST /api/push/register-player/` avec `{ player_id }`
3. Stocké dans `User.onesignal_player_id`

### 18.4 Envoi de notifications depuis le backend

Pour envoyer une notification ciblée :

```python
import requests

def send_push(player_id, title, body):
    requests.post(
        "https://onesignal.com/api/v1/notifications",
        json={
            "app_id": settings.ONESIGNAL_APP_ID,
            "include_player_ids": [player_id],
            "headings": {"en": title},
            "contents": {"en": body},
        },
        headers={"Authorization": f"Basic <REST_API_KEY>"},
    )
```

> La **REST API Key** OneSignal doit être ajoutée au `.env` si les notifications backend sont utilisées.

---

## 19. Intégration Google Gemini IA

### 19.1 Configuration

Dans `DjangoAPI/.env` :
```env
GEMINI_API_KEY=<clé depuis aistudio.google.com>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_SECONDS=90
GEMINI_SOURCE_MAX_CHARS=12000
```

### 19.2 Utilisation dans le backend

Les appels Gemini sont effectués via **HTTP REST direct** (sans SDK Python) :

```python
import requests

def call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    resp = requests.post(url, json=payload, timeout=GEMINI_TIMEOUT_SECONDS)
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
```

### 19.3 Prompts utilisés

| Fonctionnalité | Prompt type |
|---|---|
| Résumé Bref | "Génère un résumé en points clés de ce document : [texte tronqué à 12000 chars]" |
| Résumé Moyen | "Génère un résumé structuré avec introduction et sections de ce document..." |
| Résumé Détaillé | "Génère une analyse approfondie avec tous les détails importants de ce document..." |
| Quiz | "Génère X questions de type [format] avec difficulté [niveau] sur ce document. Retourne du JSON : [{question, options, correct_answer, explanation}]" |
| Analyse faiblesses | "Voici les erreurs récentes d'un étudiant : [...]. Donne des conseils personnalisés." |

### 19.4 Limites et quotas

- La clé API gratuite a un quota quotidien (vérifier sur `aistudio.google.com`)
- `GEMINI_SOURCE_MAX_CHARS=12000` tronque le texte source pour éviter de dépasser les limites de tokens du modèle
- `GEMINI_TIMEOUT_SECONDS=90` : les requêtes complexes peuvent prendre 30-60s, d'où le timeout élevé

---

## 20. Email SMTP Gmail

### 20.1 Configuration

Dans `DjangoAPI/.env` :
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<adresse Gmail>
EMAIL_HOST_PASSWORD=<App Password — PAS le mot de passe Gmail standard>
DEFAULT_FROM_EMAIL=Boilot <<adresse Gmail>>
```

### 20.2 Créer un App Password Gmail

1. Aller sur `https://myaccount.google.com/security`
2. Activer la **Vérification en deux étapes** (obligatoire)
3. Dans "Connexion à Google" → "Mots de passe des applications"
4. Sélectionner "Autre (nom personnalisé)" → saisir "Boileau"
5. Copier le mot de passe généré (16 caractères) → coller dans `.env`

### 20.3 Email de réinitialisation de mot de passe

**Expéditeur** : `DEFAULT_FROM_EMAIL`
**Destinataire** : email de l'utilisateur
**Objet** : "Code de réinitialisation Boileau" (vérifier dans `users/views.py`)
**Corps** : "Votre code de réinitialisation est : XXXXXX. Valide 10 minutes."

---

## 21. Répétition espacée (SRS)

### 21.1 Algorithme SM-2

L'algorithme SuperMemo 2 détermine l'intervalle optimal entre les révisions :

- **Intervalle initial** : 1 jour
- Après chaque révision (bouton "Marquer comme révisé") :
  - Si bonne réponse (`quality >= 3`) : intervalle augmente selon le facteur de facilité (`easiness_factor`)
  - Si mauvaise réponse : reset à 1 jour
  - Le `easiness_factor` démarre à 2.5 et est ajusté à chaque révision

### 21.2 Endpoints SRS

| Endpoint | Description |
|---|---|
| `GET /api/srs/due/` | Liste des documents à réviser aujourd'hui |
| `POST /api/srs/update/` | Marquer un document comme révisé, recalcule l'intervalle |

### 21.3 Modèle SRSCard

Champs importants :
- `next_review` : date de la prochaine révision calculée
- `interval` : nombre de jours jusqu'à la prochaine révision
- `repetitions` : nombre de révisions réussies consécutives
- `easiness_factor` : facteur de facilité (2.5 par défaut, min 1.3)

---

## 22. Endpoints API — référence complète

Base URL : `http://127.0.0.1:8000/api/` (développement)

### Authentification

| Méthode | Endpoint | Auth | Corps | Description |
|---|---|---|---|---|
| GET | `/public-config/` | Non | — | Google Client ID + OneSignal App ID |
| POST | `/register/` | Non | `{email, password}` | Inscription |
| POST | `/login/` | Non | `{email, password}` | Connexion → JWT |
| POST | `/google-login/` | Non | `{token}` | Connexion Google |
| GET | `/me/` | Oui | — | Profil utilisateur courant |
| POST | `/forgot-password/` | Non | `{email}` | Envoie code par email |
| POST | `/verify-code/` | Non | `{email, code}` | Vérifie le code |
| POST | `/reset-password/` | Non | `{email, code, new_password}` | Change le MDP |
| POST | `/push/register-player/` | Oui | `{player_id}` | Sync OneSignal |
| POST | `/token/refresh/` | Non | `{refresh}` | Rafraîchit l'access token |

### Documents

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/documents/` | Oui | Liste des documents de l'utilisateur |
| POST | `/documents/` | Oui | Upload d'un nouveau PDF |
| GET | `/documents/{id}/` | Oui | Détail d'un document |
| DELETE | `/documents/{id}/` | Oui | Suppression |

### Résumés

| Méthode | Endpoint | Auth | Corps | Description |
|---|---|---|---|---|
| POST | `/summaries/generate/` | Oui | `{document_id, level}` | Génère et sauvegarde un résumé |
| GET | `/summaries/` | Oui | `?document_id=X` | Historique des résumés |

### Quiz

| Méthode | Endpoint | Auth | Corps | Description |
|---|---|---|---|---|
| POST | `/quizzes/generate/` | Oui | `{document_id, num_questions, difficulty, format}` | Génère un quiz |
| GET | `/quizzes/` | Oui | `?document_id=X` | Historique des quiz |
| GET | `/quizzes/{id}/` | Oui | — | Détail d'un quiz |
| POST | `/quizzes/{id}/submit/` | Oui | `{answers, time_spent_seconds}` | Soumet les résultats |

### Analytiques

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/analytics/summary/` | Oui | Stats globales, badges, mastery_levels |
| GET | `/analytics/dashboard/` | Oui | Progression 7j, benchmark, score projeté, top 3 faibles |
| GET | `/analytics/daily-challenges/` | Oui | Défis quotidiens calculés en temps réel |
| GET | `/ai/weaknesses/` | Oui | Analyse Gemini des erreurs récentes |

### SRS

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/srs/due/` | Oui | Documents à réviser aujourd'hui |
| POST | `/srs/update/` | Oui | Marque un document comme révisé |

### Amis

| Méthode | Endpoint | Auth | Corps | Description |
|---|---|---|---|---|
| GET | `/friends/` | Oui | — | Liste d'amis acceptés |
| POST | `/friends/request/` | Oui | `{to_user}` | Envoie une demande |
| GET | `/friends/requests/` | Oui | — | Demandes reçues en attente |
| POST | `/friends/requests/{id}/accept/` | Oui | — | Accepte une demande |
| POST | `/friends/requests/{id}/decline/` | Oui | — | Refuse une demande |

### Culture Générale

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/culture/themes/` | Oui | Liste des 12 thèmes |
| GET | `/culture/questions/` | Oui | Questions par thème (`?theme=...`) |
| POST | `/culture/submit/` | Oui | Soumet un résultat de mini-quiz |
| GET | `/culture/leaderboard/` | Oui | Classement par thème (`?theme=...`) |

---

## 23. Procédures de maintenance

### 23.1 Ajouter un nouvel utilisateur admin

```bash
python manage.py createsuperuser
```

### 23.2 Réinitialiser le mot de passe d'un utilisateur (sans email)

```bash
python manage.py shell
>>> from users.models import User
>>> u = User.objects.get(email="user@example.com")
>>> u.set_password("nouveauMotDePasse123!")
>>> u.save()
```

### 23.3 Voir les logs d'erreurs Django

Par défaut, Django affiche les erreurs dans la console. En production, configurer `LOGGING` dans `settings.py`.

### 23.4 Nettoyer les anciens codes de réinitialisation

```bash
python manage.py shell
>>> from users.models import PasswordResetCode
>>> import datetime
>>> cutoff = datetime.datetime.now() - datetime.timedelta(hours=1)
>>> PasswordResetCode.objects.filter(created_at__lt=cutoff).delete()
```

### 23.5 Recharger les questions de culture générale

Les 48 questions peuvent être rechargées via une fixture Django :

```bash
python manage.py loaddata culture_questions.json
```

(Créer le fichier JSON via `dumpdata culture` d'un environnement existant.)

### 23.6 Vérifier l'état des migrations

```bash
python manage.py showmigrations
# Toutes les lignes doivent avoir [X]
```

### 23.7 Collecter les fichiers statiques (production)

```bash
python manage.py collectstatic
```

### 23.8 Vider le cache Gemini (si cache implémenté)

Gemini n'est pas mis en cache par défaut. Chaque appel à `/summaries/generate/` ou `/quizzes/generate/` appelle l'API Gemini en temps réel.

---

## 24. Sécurité

### 24.1 Résumé des mesures

| Point | Implémentation |
|---|---|
| Secrets | Tous dans `DjangoAPI/.env` — jamais dans le code source |
| `.gitignore` | `DjangoAPI/.env` et `boilot/.env` exclus du dépôt |
| Google OAuth | Token vérifié côté serveur via `googleapis.com/oauth2/v3/tokeninfo` + `email_verified` obligatoire |
| JWT | Access 2h, Refresh 7j, nettoyage complet localStorage+sessionStorage à la déconnexion |
| Réinitialisation MDP | Code 6 chiffres, expiration 10 min, usage unique (marqué `is_used`) |
| Endpoints | `IsAuthenticated` par défaut, `AllowAny` uniquement sur login/register/public-config |
| Config frontend | Exposée via `/api/public-config/` — aucune variable sensible dans le frontend |
| CORS | Configurer `CORS_ALLOWED_ORIGINS` dans `settings.py` pour la production |
| Mots de passe | Hashés via Django PBKDF2 (par défaut) |

### 24.2 Avant la mise en production

- [ ] Changer `SECRET_KEY` pour une vraie clé secrète longue et aléatoire
- [ ] Mettre `DEBUG = False` dans `settings.py`
- [ ] Configurer `ALLOWED_HOSTS` avec le vrai domaine
- [ ] Configurer `CORS_ALLOWED_ORIGINS` avec l'URL du frontend
- [ ] Ajouter l'URL de production dans Google Cloud Console (OAuth origins)
- [ ] Utiliser HTTPS (certificat SSL) — obligatoire pour les notifications push
- [ ] Configurer un vrai serveur WSGI (gunicorn) et un reverse proxy (nginx)

### 24.3 Variables à ne jamais exposer publiquement

- `SECRET_KEY`
- `EMAIL_HOST_PASSWORD`
- `GEMINI_API_KEY`
- `DATABASE_PASSWORD` (si configuré séparément)
- La **REST API Key** OneSignal (différente de l'App ID public)

---

## 25. Recommandations pour une administration simple et efficace

### 25.1 Principe général : tout depuis un seul endroit

L'objectif est de ne jamais avoir à toucher au code pour les opérations courantes. Voici la répartition recommandée des outils selon la tâche.

| Besoin | Outil recommandé | URL / Commande |
|---|---|---|
| Gérer les utilisateurs | Django Admin | `http://127.0.0.1:8000/admin/` |
| Modifier les questions culture | Django Admin | `http://127.0.0.1:8000/admin/culture/` |
| Envoyer une notification à tous | OneSignal Dashboard | `https://app.onesignal.com` |
| Modifier la config (clés API, SMTP) | Fichier `.env` uniquement | `DjangoAPI/.env` |
| Voir les erreurs en temps réel | Console Django (terminal) | `python manage.py runserver` |
| Interroger la base directement | Django Shell | `python manage.py shell` |
| Sauvegarder les données | Django dumpdata | `python manage.py dumpdata` |

---

### 25.2 Activer et optimiser l'interface Django Admin

L'admin Django est le panneau de contrôle central. Par défaut il fonctionne mais quelques ajustements le rendent beaucoup plus puissable.

**Enregistrer tous les modèles utiles** dans les fichiers `admin.py` de chaque app. Exemple pour l'app `users` (`DjangoAPI/users/admin.py`) :

```python
from django.contrib import admin
from .models import User, UserStats, PasswordResetCode

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'username', 'date_joined', 'is_active', 'is_staff']
    search_fields = ['email', 'username']
    list_filter = ['is_active', 'is_staff', 'date_joined']
    ordering = ['-date_joined']

@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    list_display = ['user', 'xp', 'level', 'current_streak']
    search_fields = ['user__email', 'user__username']
    ordering = ['-xp']

@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'created_at', 'is_used']
    list_filter = ['is_used']
```

Faire la même chose pour toutes les apps : `documents`, `quizzes`, `analytics`, `srs`, `friends`, `culture`.

**Avantage** : l'admin devient un vrai outil de gestion — recherche, filtres, tri, export — sans jamais ouvrir un terminal.

---

### 25.3 Créer des commandes de gestion personnalisées

Pour les tâches répétitives, créer des **management commands** Django évite d'ouvrir un shell Python à chaque fois.

**Exemple : nettoyer les codes de réinitialisation expirés**

Créer `DjangoAPI/users/management/commands/clean_reset_codes.py` :

```python
from django.core.management.base import BaseCommand
from users.models import PasswordResetCode
import datetime

class Command(BaseCommand):
    help = 'Supprime les codes de réinitialisation expirés'

    def handle(self, *args, **kwargs):
        cutoff = datetime.datetime.now() - datetime.timedelta(hours=1)
        deleted, _ = PasswordResetCode.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(f'{deleted} code(s) supprimé(s)')
```

Usage :
```bash
python manage.py clean_reset_codes
```

**Planifier cette commande** (cron Linux ou Task Scheduler Windows) pour l'exécuter automatiquement chaque heure.

---

### 25.4 Tableau de bord des indicateurs clés (KPIs)

Créer une vue d'administration personnalisée dans Django Admin pour voir en un coup d'œil l'état de la plateforme. Ajouter dans `DjangoAPI/APIBoileau/admin.py` :

```python
from django.contrib.admin import AdminSite
from django.contrib import admin
from users.models import User, UserStats
from quizzes.models import Result
from documents.models import Document
import datetime

class BoileauAdminSite(AdminSite):
    site_header = "Boileau Administration"
    site_title = "Boileau Admin"
    index_title = "Tableau de bord"

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}
        today = datetime.date.today()
        extra_context['stats'] = {
            'users_total': User.objects.count(),
            'users_today': User.objects.filter(date_joined__date=today).count(),
            'quizzes_today': Result.objects.filter(date_passed__date=today).count(),
            'documents_total': Document.objects.count(),
            'avg_score_today': Result.objects.filter(date_passed__date=today).aggregate(
                avg=models.Avg('score'))['avg'] or 0,
        }
        return super().index(request, extra_context)
```

Ces chiffres apparaîtront sur la page d'accueil de l'admin.

---

### 25.5 Gestion des utilisateurs — procédures courantes

**Désactiver un compte problématique** (sans le supprimer) :
```
Admin → Users → [utilisateur] → décocher "Active" → Sauvegarder
```
L'utilisateur ne peut plus se connecter. Ses données sont conservées.

**Accorder les droits admin à un utilisateur existant** :
```
Admin → Users → [utilisateur] → cocher "Staff status" → Sauvegarder
```

**Voir l'activité d'un utilisateur** :
```
Admin → Results → filtrer par user → voir tous ses quiz
Admin → Documents → filtrer par user → voir ses documents
Admin → UserStats → chercher par email → voir XP, niveau, streak
```

**Supprimer un compte et toutes ses données** :
```
Admin → Users → [utilisateur] → bouton "Supprimer"
```
Attention : action irréversible. Les documents uploadés sur le disque ne sont supprimés que si le signal `post_delete` est configuré sur le modèle `Document`.

---

### 25.6 Gestion du contenu Culture Générale

La base de données contient 48 questions (4 par thème). Pour la maintenir à jour sans toucher au code :

**Ajouter une question** :
```
Admin → Culture questions → Ajouter
Remplir : theme, question, options (JSON), correct_answer, explanation
```

**Modifier une question** :
```
Admin → Culture questions → cliquer sur la question → modifier → sauvegarder
```

**Exporter toutes les questions pour sauvegarde** :
```bash
python manage.py dumpdata culture.CultureQuestion --indent 2 > culture_backup.json
```

**Importer depuis une sauvegarde** :
```bash
python manage.py loaddata culture_backup.json
```

**Recommandation qualité** : toujours renseigner le champ `explanation`. C'est ce texte qui apparaît aux utilisateurs après correction — une bonne explication améliore l'expérience d'apprentissage.

---

### 25.7 Surveillance des quotas des services externes

Les services tiers ont des limites gratuites. Vérifier régulièrement :

**Google Gemini :**
- Dashboard : `https://aistudio.google.com/app/apikey`
- Quota free tier : environ 1 500 requêtes/jour avec `gemini-2.5-flash`
- Si quota dépassé : les générations de résumés et quiz échouent avec une erreur 429
- Solution immédiate : attendre le reset quotidien (minuit heure Pacifique) ou passer sur un compte payant

**OneSignal :**
- Dashboard : `https://app.onesignal.com`
- Plan free : jusqu'à 10 000 abonnés Web Push — largement suffisant en phase de lancement
- Surveiller : taux d'opt-in (% d'utilisateurs ayant accepté les notifications), taux d'ouverture

**Gmail SMTP :**
- Limite : 500 emails/jour avec un compte Gmail personnel
- Si limite atteinte : les emails de réinitialisation de mot de passe ne partent plus
- Solution recommandée en production : migrer vers un service dédié (SendGrid, Mailgun) en changeant uniquement les 3 lignes SMTP dans `.env`

---

### 25.8 Stratégie de sauvegarde recommandée

**Fréquence** : quotidienne pour les données actives, hebdomadaire pour la config.

**Données à sauvegarder :**

```bash
# 1. Dump de la base de données complète
python manage.py dumpdata --indent 2 --exclude contenttypes --exclude auth.permission > backup_$(date +%Y%m%d).json

# 2. Sauvegarde des fichiers PDF uploadés
# Copier le dossier DjangoAPI/media/ vers un stockage externe

# 3. Sauvegarde de la config (ne JAMAIS versionner dans git)
# Copier DjangoAPI/.env vers un gestionnaire de secrets sécurisé
```

**Restauration d'urgence :**
```bash
python manage.py flush              # vide la base
python manage.py loaddata backup_YYYYMMDD.json
```

---

### 25.9 Monitoring simple sans infrastructure lourde

En l'absence d'outils comme Sentry ou Datadog, voici une surveillance minimale efficace :

**Logs Django vers un fichier** — ajouter dans `settings.py` :
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/django_errors.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}
```

Créer le dossier : `mkdir DjangoAPI/logs`

**Vérifier les erreurs** (chaque matin) :
```bash
tail -50 DjangoAPI/logs/django_errors.log
```

**Vérifier que le serveur répond** :
```bash
curl http://127.0.0.1:8000/api/public-config/
# Doit retourner {"google_client_id": "...", "onesignal_app_id": "..."}
```

---

### 25.10 Gestion des clés API — rotation et remplacement

Si une clé API est compromise ou expirée, le remplacement est immédiat et ne nécessite aucun redémarrage de code :

**Remplacer la clé Gemini :**
1. Générer une nouvelle clé sur `https://aistudio.google.com`
2. Modifier `GEMINI_API_KEY=...` dans `DjangoAPI/.env`
3. Redémarrer Django : `Ctrl+C` puis `python manage.py runserver`

**Remplacer le mot de passe SMTP Gmail :**
1. Révoquer l'ancien App Password sur `https://myaccount.google.com/security`
2. Créer un nouveau App Password
3. Modifier `EMAIL_HOST_PASSWORD=...` dans `DjangoAPI/.env`
4. Redémarrer Django

**Changer la SECRET_KEY Django :**
- Conséquence : toutes les sessions actives sont invalidées (les utilisateurs doivent se reconnecter)
- À faire uniquement en cas de compromission, pas en routine
- Générer une nouvelle clé : `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

---

### 25.11 Points d'attention pour la croissance

Ces points n'impactent pas le fonctionnement actuel mais deviennent importants à partir de quelques centaines d'utilisateurs :

**Base de données :**
- Ajouter des index sur `Result.user` et `Result.date_passed` pour accélérer les requêtes analytiques
- La vue `DailyChallengesView` fait plusieurs requêtes par appel — à mettre en cache (Redis, 1 min) si le trafic augmente

**Fichiers PDF uploadés :**
- Actuellement stockés sur le disque local (`DjangoAPI/media/`)
- Migrer vers un stockage objet (S3, Cloudflare R2) pour la production distribuée en changeant `DEFAULT_FILE_STORAGE` dans `settings.py`

**Gemini et les temps de réponse :**
- Les résumés et quiz prennent 10-60s — normal pour une IA
- Afficher explicitement un loader avec message "L'IA analyse votre document..." côté frontend pour éviter la frustration
- En cas de timeout récurrent, augmenter `GEMINI_TIMEOUT_SECONDS` dans `.env`

**OneSignal et les tokens expirés :**
- Les `onesignal_player_id` stockés en base peuvent devenir invalides si l'utilisateur désinstalle l'app ou change de navigateur
- OneSignal gère cela automatiquement côté dashboard (abonnés "inactifs")
- Nettoyage recommandé : supprimer les `player_id` qui retournent une erreur 400 lors de l'envoi

---

### 25.12 Checklist de mise en service (récapitulatif)

Avant de déclarer l'application prête à accueillir des utilisateurs réels :

**Configuration :**
- [ ] `DjangoAPI/.env` rempli avec toutes les vraies clés de production
- [ ] `SECRET_KEY` changée pour une clé aléatoire forte
- [ ] `DEBUG = False` dans `settings.py`
- [ ] `ALLOWED_HOSTS` contient le vrai domaine

**Base de données :**
- [ ] `python manage.py migrate` exécuté sans erreur
- [ ] Au moins un superutilisateur créé via `createsuperuser`
- [ ] Questions de culture générale chargées en base (48 questions)

**Services externes :**
- [ ] Email SMTP testé : envoyer un code de réinitialisation et le recevoir
- [ ] Google OAuth testé : se connecter avec un compte Google
- [ ] Gemini testé : générer un résumé et un quiz
- [ ] OneSignal testé : recevoir une notification push

**Sécurité :**
- [ ] `DjangoAPI/.env` exclu du dépôt git (vérifier `.gitignore`)
- [ ] HTTPS configuré sur le serveur de production
- [ ] `CORS_ALLOWED_ORIGINS` restreint au domaine du frontend

**Admin :**
- [ ] Accès à `http://votre-domaine.com/admin/` vérifié
- [ ] Tous les modèles apparaissent dans l'admin
- [ ] Sauvegarde initiale créée (`dumpdata`)
