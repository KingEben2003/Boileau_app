# Boileau — Plateforme d'apprentissage intelligente

Boileau transforme vos documents PDF en expériences d'apprentissage interactives.
Uploadez un cours, obtenez instantanément des résumés et des quiz générés par IA, suivez votre progression et défiez vos amis.

---

## Fonctionnalités

- Upload de documents PDF avec extraction automatique du texte
- Génération de quiz (QCM, Vrai/Faux, Mixte) par IA selon le niveau de difficulté
- Génération de résumés (bref, moyen, détaillé) par IA
- Révision espacée automatique (algorithme SM-2)
- Quiz de culture générale par thème
- Système d'amis et de défis quiz entre utilisateurs
- Gamification : XP, niveaux, badges, streak journalier
- Notifications push via OneSignal
- Panel d'administration dédié

---

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | Django 4 + Django REST Framework |
| Frontend | React 18 + Tailwind CSS |
| IA | Google Gemini API |
| Authentification | SimpleJWT (cookies HTTP-only) + Google OAuth 2.0 |
| Notifications | OneSignal |
| Base de données | MySQL |

---

## Structure du projet

```
boileau/
├── back/                   # API Django
│   ├── APIBoileau/         # Configuration (settings, urls)
│   ├── users/              # Auth, profil, stats, feature requests
│   ├── documents/          # Upload et extraction PDF
│   ├── quizzes/            # Quiz, questions, résultats
│   ├── summaries/          # Résumés IA
│   ├── srs/                # Révision espacée (SM-2)
│   ├── friends/            # Amis, défis, notifications
│   ├── culture/            # Culture générale
│   ├── adminapi/           # Endpoints panel admin
│   └── requirements.txt
└── front/
    ├── user/               # Application React utilisateur
    └── admin/              # Application React admin
```

---

## Exécution en local

### Backend

```bash
cd back
python -m venv .venv
.venv\Scripts\activate      # Windows — ou : source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # renseigner SECRET_KEY, DATABASE_URL, GEMINI_API_KEY
python manage.py migrate
python manage.py runserver
```

API disponible sur `http://localhost:8000/api/`.

### Frontend utilisateur

```bash
cd front/user
npm install --legacy-peer-deps
npm start
```

Application disponible sur `http://localhost:3000`.

### Frontend admin

```bash
cd front/admin
npm install --legacy-peer-deps
npm start
```

---

## Auteur

Soro Zié Ebenezer — NCE CI0222062049 — Master 1 Génie Informatique
