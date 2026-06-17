<?php
$uri = $_SERVER['REQUEST_URI'];
if (strpos($uri, '/api/') !== 0) { http_response_code(400); exit; }

$targetUrl = 'https://boileauapi.sc1zds18.universe.wf' . $uri;
$method    = $_SERVER['REQUEST_METHOD'];
$fwdHeaders = ['X-Forwarded-Proto: https'];

$contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
$isMultipart = strpos($contentType, 'multipart/form-data') !== false;

foreach (getallheaders() as $name => $value) {
    $l = strtolower($name);
    if (in_array($l, ['authorization', 'cookie', 'x-csrftoken', 'accept'])) {
        $fwdHeaders[] = "$name: $value";
    }
    // Pour multipart, cURL génère lui-même le Content-Type avec le bon boundary
    if ($l === 'content-type' && !$isMultipart) {
        $fwdHeaders[] = "$name: $value";
    }
}

$ch = curl_init($targetUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => $fwdHeaders,
    CURLOPT_HEADER         => true,
    CURLOPT_FOLLOWLOCATION => false,
]);

if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    if ($isMultipart) {
        // php://input N'EST PAS disponible pour multipart/form-data :
        // PHP a déjà parsé le corps → on reconstruit le multipart via $_FILES/$_POST
        $postFields = $_POST;
        foreach ($_FILES as $field => $f) {
            if ($f['error'] === UPLOAD_ERR_OK) {
                $postFields[$field] = new CURLFile($f['tmp_name'], $f['type'], $f['name']);
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
    }
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo '{"error":"Backend indisponible"}';
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE));
curl_close($ch);

foreach (explode("\r\n", substr($response, 0, $headerSize)) as $line) {
    $l = strtolower($line);
    if (strpos($l, 'content-type:') === 0 || strpos($l, 'set-cookie:') === 0) {
        header($line, false);
    }
}

echo substr($response, $headerSize);
