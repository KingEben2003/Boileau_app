#!/bin/bash
# deploy.sh — Script de déploiement O2Switch
# Appelé par webhook.php après un push GitHub
# Exécution : bash /home/VOTRE_USER/deploy.sh
#
# CONFIGURATION — adaptez ces chemins à votre hébergement O2Switch
# ─────────────────────────────────────────────────────────────────
DEPLOY_PATH="/home3/sc1zds18/Boileau_app"
PYTHON_BIN="/home3/sc1zds18/virtualenv/Boileau_app/back/3.12/bin/python"
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
echo "=== [4/5] Redémarrage Phusion Passenger ==="
mkdir -p tmp && touch tmp/restart.txt
echo "OK"

# ── 5. Vérification post-déploiement ────────────────────────────────────────
echo ""
echo "=== [5/5] Vérification health check ==="
sleep 5   # laisser Passenger redémarrer
HEALTH_URL="https://boileau.sc1zds18.universe.wf/health/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HEALTH_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "Health check OK (HTTP 200)"
else
    echo "AVERTISSEMENT : health check a retourné HTTP $HTTP_CODE (l'app a peut-être besoin de plus de temps)"
fi

echo ""
echo "════════════════════════════════════════"
echo " Déploiement terminé : $(date)"
echo "════════════════════════════════════════"
