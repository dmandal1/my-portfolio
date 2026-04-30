<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

if ($method === 'GET') {
    $row = $db->query('SELECT settings_json FROM admin_settings WHERE id = 1')->fetch();
    $settings = $row ? json_decode($row['settings_json'], true) : [];
    jsonResponse($settings ?: (object)[]);
}

if ($method === 'POST') {
    requireAuth();
    $data = getRequestBody();
    $json = json_encode($data);

    $exists = $db->query('SELECT id FROM admin_settings WHERE id = 1')->fetch();
    if ($exists) {
        $db->prepare('UPDATE admin_settings SET settings_json = ?, updated_at = NOW() WHERE id = 1')
           ->execute([$json]);
    } else {
        $db->prepare('INSERT INTO admin_settings (id, settings_json) VALUES (1, ?)')->execute([$json]);
    }

    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
