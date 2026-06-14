<?php
/**
 * webhook.php — Récepteur de déploiement GitHub Actions
 *
 * PLACEMENT : dans un dossier public accessible en HTTPS
 *   ex: /home/VOTRE_USER/www/deploy/webhook.php
 *   URL: https://votre-domaine.com/deploy/webhook.php
 *
 * PROTECTION : créez un fichier .htaccess dans le même dossier avec :
 *   Options -Indexes
 */
declare(strict_types=1);

// ── Validation du secret ────────────────────────────────────────────────────
$secret = 'REMPLACER_PAR_VOTRE_DEPLOY_WEBHOOK_SECRET';

$received = $_SERVER['HTTP_X_DEPLOY_SECRET'] ?? '';
if (!hash_equals($secret, $received)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ── Lancement du script de déploiement en arrière-plan ─────────────────────
$script  = '/home/VOTRE_USER/deploy.sh';
$logfile = '/home/VOTRE_USER/deploy.log';

if (!file_exists($script)) {
    http_response_code(500);
    echo json_encode(['error' => "deploy.sh introuvable : $script"]);
    exit;
}

// nohup détache le processus du serveur web — il continue après la réponse HTTP
exec("nohup bash " . escapeshellarg($script) . " > " . escapeshellarg($logfile) . " 2>&1 &");

http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
    'status'  => 'deployment triggered',
    'log'     => 'Consultez ~/deploy.log sur O2Switch pour suivre le déploiement',
    'time'    => date('Y-m-d H:i:s T'),
]);
