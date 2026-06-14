#!/bin/bash
# deploy.sh — Script de déploiement O2Switch
# Appelé par webhook.php après un push GitHub
# Exécution : bash /home/VOTRE_USER/deploy.sh
#
# CONFIGURATION — adaptez ces chemins à votre hébergement O2Switch
# ─────────────────────────────────────────────────────────────────
DEPLOY_PATH="/home/VOTRE_USER/boileau"
PYTHON_BIN="/home/VOTRE_USER/virtualenv/boileau/back/3.12/bin/python"
# Les React builds sont servis directement depuis :
#   front/user/build/  → document root de boileau.sc1zds18.universe.wf
#   front/admin/build/ → document root de admin.boileau.sc1zds18.universe.wf
# Configurer ces chemins dans cPanel → Subdomains
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

# Les builds React sont dans le repo (branche deploy) — cPanel sert
# front/user/build/ et front/admin/build/ directement. Pas de rsync.

# ── 2. Dépendances Python ───────────────────────────────────────────────────
echo ""
echo "=== [2/4] Installation des dépendances Python ==="
cd "$DEPLOY_PATH/back"
"$PYTHON_BIN" -m pip install -r requirements.txt --quiet
echo "OK"

# ── 3. Migrations & fichiers statiques ──────────────────────────────────────
echo ""
echo "=== [3/4] Migrations + collectstatic ==="
"$PYTHON_BIN" manage.py migrate --no-input
"$PYTHON_BIN" manage.py collectstatic --no-input --clear
echo "OK"

# ── 4. Redémarrage Passenger ────────────────────────────────────────────────
echo ""
echo "=== [4/4] Redémarrage Phusion Passenger ==="
mkdir -p tmp && touch tmp/restart.txt
echo "OK"

echo ""
echo "════════════════════════════════════════"
echo " Déploiement terminé : $(date)"
echo "════════════════════════════════════════"
