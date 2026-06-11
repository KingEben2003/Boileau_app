# Boileau — Console d'administration

Application React (CRA + Tailwind) servant de panneau d'administration pour la plateforme Boileau.
Elle consomme l'API Django REST et reprend le design system du front utilisateur (dark glassmorphism, mobile-first).

## Démarrage

Depuis le dossier `front/` (monorepo) :

```bash
npm run install:all     # installe racine + user + admin (première fois)
npm run dev             # lance user (http://localhost:3000) + admin (http://localhost:3001)
```

Ou en isolé :

```bash
npm start --prefix admin   # http://localhost:3001
```

> Le proxy CRA (`admin/package.json`) redirige `/api` vers `http://127.0.0.1:8000`. Le backend Django doit tourner.

## Accès

La console est **réservée aux comptes `is_staff` / `is_superuser`**. La connexion utilise les mêmes
tokens JWT que l'API (`POST /api/token/`), stockés sous des clés préfixées `admin_` (localStorage)
pour ne pas interférer avec l'app utilisateur.

## Architecture

```
src/
├── App.js                 # Routing (react-router v7) + routes protégées + lazy loading
├── AuthContext.jsx        # Auth admin (login staff-only, restauration de session)
├── services/api.js        # Client axios + refresh JWT auto + fonctions API admin
├── lib/motion.js          # Presets framer-motion (partagés avec le front user)
├── hooks/                 # useMedia, useTilt
├── components/
│   ├── layout/            # AdminLayout, Sidebar (NavLink), Topbar, navItems
│   └── ui/                # Spinner, States, Badge, StatCard, PageHeader, Modal, DataTable
└── pages/                 # Dashboard, Users, Documents, Quizzes, Summaries, Culture, Friends, SRS
```

## ⚠️ Endpoints backend requis

Le frontend est prêt ; il attend les endpoints REST **admin** ci-dessous (à créer côté Django, protégés
par `IsAdminUser`). Tant qu'ils n'existent pas, les pages affichent un état d'erreur « Réessayer ».

| Page | Méthode & route | Réponse attendue |
|------|-----------------|------------------|
| Dashboard | `GET /api/admin/stats/` | `{ users_total, users_today, active_users_7d, quizzes_today, quizzes_total, documents_total, summaries_total, avg_score_today, signups_7d: [{date,count}], quizzes_7d: [{date,count}] }` |
| Utilisateurs | `GET /api/admin/users/?search=` | liste (ou `{results:[...]}`) de `{ id, username, email, date_joined, is_active, is_staff, is_superuser }` |
| | `PATCH /api/admin/users/:id/` | maj partielle (`is_active`, `is_staff`) |
| | `DELETE /api/admin/users/:id/` | 204 |
| Documents | `GET /api/admin/documents/` · `DELETE /api/admin/documents/:id/` | `{ id, title, user, created_at }` |
| Quiz/Résultats | `GET /api/admin/results/` | `{ id, user, score, time_spent_seconds, date_passed, document_title? }` |
| Résumés | `GET /api/admin/summaries/` | `{ id, user, document_title?, level, created_at }` |
| Culture | `GET/POST /api/admin/culture-questions/` · `PATCH/DELETE /api/admin/culture-questions/:id/` | `{ id, theme, question, options:[...], correct_answer:int, explanation }` |
| Amis | `GET /api/admin/friend-requests/` | `{ id, from_user, to_user, status, sent_at }` |
| SRS | `GET /api/admin/srs-cards/` | `{ id, user, document_title?, next_review, interval, repetitions, easiness_factor }` |

Les listes acceptent indifféremment un tableau brut ou un objet paginé `{ results: [...] }`.
Le champ `user` peut être un objet (`{username,email}`) ou une chaîne — le frontend gère les deux.

> Implémentation conseillée : un app Django `adminapi` (ou des `ViewSet` DRF avec `permission_classes=[IsAdminUser]`)
> exposant ces routes. `correct_answer` est traité comme un **index 0-based** dans les options.
