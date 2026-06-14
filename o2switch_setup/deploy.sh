#!/bin/bash
# deploy.sh — Script de déploiement O2Switch
# Appelé par webhook.php après un push GitHub
# Exécution : bash /home/VOTRE_USER/deploy.sh
#
# CONFIGURATION — adaptez ces chemins à votre hébergement O2Switch
# ─────────────────────────────────────────────────────────────────
DEPLOY_PATH="/home/VOTRE_USER/boileau"
PYTHON_BIN="/home/VOTRE_USER/virtualenv/boileau/back/3.12/bin/python"
FRONTEND_PATH="/home/VOTRE_USER/app.votre-domaine.com"
FRONTEND_ADMIN_PATH="/home/VOTRE_USER/admin.app.votre-domaine.com"
# ─────────────────────────────────────────────────────────────────

set -e
echo ""
echo "════════════════════════════════════════"
echo " Déploiement démarré : $(date)"
echo "════════════════════════════════════════"

# ── 1. Récupérer les derniers builds depuis la branche deploy ───────────────
echo ""
echo "=== [1/6] Pull de la branche deploy ==="
cd "$DEPLOY_PATH"
git fetch origin
git checkout -B deploy origin/deploy
git pull origin deploy --force
echo "OK"

# ── 2. Déployer React user ──────────────────────────────────────────────────
echo ""
echo "=== [2/6] Déploiement React user → $FRONTEND_PATH ==="
rsync -av --delete front/user/build/ "$FRONTEND_PATH/"
echo "OK"

# ── 3. Déployer React admin ─────────────────────────────────────────────────
echo ""
echo "=== [3/6] Déploiement React admin → $FRONTEND_ADMIN_PATH ==="
rsync -av --delete front/admin/build/ "$FRONTEND_ADMIN_PATH/"
echo "OK"

# ── 4. Dépendances Python ───────────────────────────────────────────────────
echo ""
echo "=== [4/6] Installation des dépendances Python ==="
cd "$DEPLOY_PATH/back"
"$PYTHON_BIN" -m pip install -r requirements.txt --quiet
echo "OK"

# ── 5. Migrations & fichiers statiques ──────────────────────────────────────
echo ""
echo "=== [5/6] Migrations + collectstatic ==="
"$PYTHON_BIN" manage.py migrate --no-input
"$PYTHON_BIN" manage.py collectstatic --no-input --clear
echo "OK"

# ── 6. Redémarrage Passenger ────────────────────────────────────────────────
echo ""
echo "=== [6/6] Redémarrage Phusion Passenger ==="
mkdir -p tmp && touch tmp/restart.txt
echo "OK"

echo ""
echo "════════════════════════════════════════"
echo " Déploiement terminé : $(date)"
echo "════════════════════════════════════════"
