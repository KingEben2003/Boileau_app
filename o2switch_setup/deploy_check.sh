#!/bin/bash
# deploy_check.sh — Vérifie toutes les minutes s'il y a un nouveau commit
# sur la branche "deploy" et lance deploy.sh si besoin.
#
# INSTALLATION sur O2Switch :
#   1. cp ~/boileau/o2switch_setup/deploy_check.sh ~/deploy_check.sh
#   2. chmod +x ~/deploy_check.sh
#   3. Dans cPanel → Cron Jobs, ajouter :
#      Commande : bash /home/VOTRE_USER/deploy_check.sh
#      Fréquence : toutes les minutes (* * * * *)

DEPLOY_PATH="/home3/sc1zds18/Boileau_app"
DEPLOY_SCRIPT="/home3/sc1zds18/Boileau_app/o2switch_setup/deploy.sh"
LOCKFILE="/home3/sc1zds18/boileau_deploy.lock"
LOGFILE="/home3/sc1zds18/boileau_deploy.log"

# Empêche les exécutions simultanées
if [ -f "$LOCKFILE" ]; then
    exit 0
fi

cd "$DEPLOY_PATH" || exit 1

# Récupère l'état de la branche deploy depuis GitHub
git fetch origin deploy --quiet 2>/dev/null

LOCAL=$(git rev-parse deploy 2>/dev/null)
REMOTE=$(git rev-parse origin/deploy 2>/dev/null)

# Rien à faire si déjà à jour
if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

# Nouveau commit détecté — lancer le déploiement
touch "$LOCKFILE"

echo "" >> "$LOGFILE"
echo "════════════════════════════════════════" >> "$LOGFILE"
echo " Nouveau commit détecté : $REMOTE" >> "$LOGFILE"
echo " Déploiement lancé      : $(date)" >> "$LOGFILE"
echo "════════════════════════════════════════" >> "$LOGFILE"

bash "$DEPLOY_SCRIPT" >> "$LOGFILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERREUR : deploy.sh a échoué (code $EXIT_CODE)" >> "$LOGFILE"
fi

rm -f "$LOCKFILE"
