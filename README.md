# Boileau — Plateforme e-learning par IA

Boileau transforme vos documents PDF en expériences d'apprentissage interactives.
Uploadez un cours, obtenez instantanément des résumés générés par IA, des quiz personnalisés, un suivi de progression et des défis multijoueurs en temps réel contre vos amis.

---

## Fonctionnalités

| Module | Description |
|---|---|
| Upload PDF | Extraction automatique du texte à l'import |
| Résumés IA | Résumés brief / medium / detailed via Google Gemini |
| Quiz | QCM, Vrai/Faux ou Mixte, avec correction visuelle et sons |
| Progression | XP, niveaux, streaks, badges, courbes d'évolution |
| SRS | Révisions espacées (algorithme SM-2) par document |
| Culture Générale | 12 thèmes, mode survie avec compte à rebours |
| Amis & Défis | Demandes d'amis, défis multijoueurs WebSocket temps réel |
| Notifications | Push browser via OneSignal |
| Admin | Console d'administration React dédiée + Django admin |

---

## Stack technique

### Backend
| Technologie | Rôle |
|---|---|
| Django 6 | Framework web Python |
| Django REST Framework | API REST |
| SimpleJWT + cookies httpOnly | Authentification sécurisée |
| Django Channels + Daphne | WebSockets (duels temps réel) |
| channels_redis | Couche WebSocket multi-process (prod) |
| PostgreSQL | Base de données principale |
| Google Gemini API | Génération de résumés et quiz par IA |
| OneSignal | Notifications push |
| Google OAuth 2.0 | Connexion via compte Google |

### Frontend
| Technologie | Rôle |
|---|---|
| React 18 | Interface utilisateur |
| Tailwind CSS | Styles utilitaires |
| Framer Motion | Animations |
| Axios | Appels API (avec intercepteur de refresh token) |
| React Router v6 | Navigation SPA |
| react-onesignal | Push notifications |

---

## Structure du projet

```
boileau/
├── back/                        # API Django
│   ├── APIBoileau/              # Configuration Django (settings, urls, asgi)
│   ├── users/                   # Auth, profil, stats utilisateur
│   ├── documents/               # Upload et extraction PDF
│   ├── summaries/               # Génération de résumés IA
│   ├── quizzes/                 # Quiz, questions, résultats
│   ├── srs/                     # Révisions espacées (SM-2)
│   ├── friends/                 # Amis, demandes, défis
│   ├── culture/                 # Questions de culture générale
│   ├── duel/                    # WebSocket duel + tickets WS
│   ├── gamesounds/              # Sons du jeu (upload admin)
│   ├── gamesettings/            # Paramètres globaux du jeu
│   ├── adminapi/                # API console admin React
│   ├── analytics/               # Vues analytics (pas de modèles)
│   ├── .env.example             # Variables d'environnement à configurer
│   └── requirements.txt
│
├── front/user/                  # Application React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.jsx      # Page d'accueil visiteurs
│   │   │   ├── Login.jsx
│   │   │   ├── layout/          # Register, Topbar, Sidebar, DashboardLayout
│   │   │   ├── Sections/        # Upload, summaryHistory, quizPlayer,
│   │   │   │                    # Progress, Friends, CultureGenerale, profil
│   │   │   └── ui/              # Composants réutilisables
│   │   ├── services/api.js      # Client Axios centralisé
│   │   ├── AuthContext.jsx      # Contexte authentification
│   │   ├── GameSoundContext.jsx # Contexte sons du jeu
│   │   └── App.js               # Routes + providers
│   ├── .env.production          # Variables de build production
│   └── package.json
│
├── .github/workflows/deploy.yml # CI/CD GitHub Actions
├── .gitignore
└── schema.dbml                  # Schéma base de données (dbdiagram.io)
```

---

## Prérequis

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+
- Redis (optionnel en dev, obligatoire en prod pour les WebSockets multi-process)

---

## Exécution en local

### 1. Cloner le dépôt

```bash
git clone https://github.com/VOTRE_USER/boileau.git
cd boileau
```

### 2. Backend Django

```bash
cd back

# Créer et activer l'environnement virtuel
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditez .env et renseignez au minimum :
#   DATABASE_URL, SECRET_KEY, GEMINI_API_KEY

# Appliquer les migrations
python manage.py migrate

# Créer un superutilisateur (accès /admin/)
python manage.py createsuperuser

# Lancer le serveur ASGI (Daphne — supporte HTTP + WebSockets)
daphne APIBoileau.asgi:application
# Ou pour le dev simple sans WebSockets :
# python manage.py runserver
```

L'API est accessible sur `http://localhost:8000/api/`.

### 3. Frontend React

```bash
cd front/user

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
```

L'application est accessible sur `http://localhost:3000`.

> Le frontend appelle par défaut `http://localhost:8000/api` (proxy configuré dans `package.json`).

### 4. (Optionnel) Redis pour les WebSockets en dev

```bash
# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Puis dans back/.env :
REDIS_URL=redis://localhost:6379/0
```

---

## Variables d'environnement

Copiez `back/.env.example` en `back/.env` et renseignez les valeurs.

| Variable | Obligatoire | Description |
|---|---|---|
| `SECRET_KEY` | Prod | Clé secrète Django |
| `DATABASE_URL` | Oui | URL de connexion PostgreSQL |
| `GEMINI_API_KEY` | Oui | Clé API Google AI Studio |
| `DEBUG` | Non | `true` en dev, `false` en prod |
| `ALLOWED_HOSTS` | Prod | Domaines autorisés |
| `REDIS_URL` | Prod | URL Redis (WebSockets multi-process) |
| `GOOGLE_CLIENT_ID` | Non | OAuth Google |
| `ONESIGNAL_APP_ID` | Non | Notifications push |
| `EMAIL_HOST_USER` | Non | Compte SMTP (reset de mot de passe) |

---

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/deploy.yml`) s'exécute automatiquement à chaque push sur `main` :

1. **Tests backend** — PostgreSQL éphémère, migrations, `manage.py test`
2. **Build frontend** — `npm ci` + `npm run build`
3. **Déploiement SSH** — copie du build, `git pull`, `migrate`, redémarrage Daphne + Nginx

Configurez les secrets dans **GitHub → Settings → Secrets and variables → Actions** (voir la liste complète en tête du fichier `deploy.yml`).

---

## Base de données

Le schéma complet est disponible dans `schema.dbml` — visualisable sur [dbdiagram.io](https://dbdiagram.io).

Pour nettoyer les tickets WebSocket expirés :

```bash
python manage.py cleanup_ws_tickets
```
