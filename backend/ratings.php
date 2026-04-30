<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

if ($method === 'GET') {
    $clientId = $_GET['client_id'] ?? '';
    $rows     = $db->query('SELECT value FROM author_ratings')->fetchAll();
    $values   = array_filter(array_column($rows, 'value'), fn($v) => $v >= 1 && $v <= 5);
    $userRating = 0;
    if ($clientId) {
        $stmt = $db->prepare('SELECT value FROM author_ratings WHERE client_id = ?');
        $stmt->execute([$clientId]);
        $row = $stmt->fetch();
        $userRating = $row ? (int)$row['value'] : 0;
    }
    jsonResponse([
        'count'      => count($values),
        'total'      => array_sum($values),
        'userRating' => $userRating,
    ]);
}

if ($method === 'POST') {
    $data     = getRequestBody();
    $clientId = $data['clientId'] ?? $data['client_id'] ?? '';
    $value    = max(1, min(5, (int)($data['value'] ?? 0)));

    if (!$clientId) errorResponse('Missing clientId');
    if (!$value)    errorResponse('Invalid rating value');

    $exists = $db->prepare('SELECT client_id FROM author_ratings WHERE client_id = ?');
    $exists->execute([$clientId]);
    $device = json_encode($data['device'] ?? []);

    if ($exists->fetch()) {
        $db->prepare('UPDATE author_ratings SET value = ?, updated_at = NOW(), device_info = ? WHERE client_id = ?')
           ->execute([$value, $device, $clientId]);
    } else {
        $db->prepare(
            'INSERT INTO author_ratings (client_id, value, updated_at, device_info) VALUES (?, ?, NOW(), ?)'
        )->execute([$clientId, $value, $device]);
    }

    $rows   = $db->query('SELECT value FROM author_ratings')->fetchAll();
    $values = array_filter(array_column($rows, 'value'), fn($v) => $v >= 1 && $v <= 5);
    jsonResponse([
        'count'      => count($values),
        'total'      => array_sum($values),
        'userRating' => $value,
    ]);
}

errorResponse('Method not allowed', 405);
