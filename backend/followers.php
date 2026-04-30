<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

if ($method === 'GET') {
    $clientId = $_GET['client_id'] ?? '';
    $count    = (int)$db->query('SELECT COUNT(*) FROM author_followers')->fetchColumn();
    $isFollowing = false;
    if ($clientId) {
        $stmt = $db->prepare('SELECT client_id FROM author_followers WHERE client_id = ?');
        $stmt->execute([$clientId]);
        $isFollowing = (bool)$stmt->fetch();
    }
    jsonResponse(['totalFollowers' => $count, 'isFollowing' => $isFollowing]);
}

if ($method === 'POST') {
    $data     = getRequestBody();
    $clientId = $data['clientId'] ?? $data['client_id'] ?? '';
    $follow   = (bool)($data['follow'] ?? true);

    if (!$clientId) errorResponse('Missing clientId');

    if ($follow) {
        $exists = $db->prepare('SELECT client_id FROM author_followers WHERE client_id = ?');
        $exists->execute([$clientId]);
        if ($exists->fetch()) {
            $db->prepare('UPDATE author_followers SET following = 1, updated_at = NOW() WHERE client_id = ?')
               ->execute([$clientId]);
        } else {
            $device = json_encode($data['device'] ?? []);
            $db->prepare(
                'INSERT INTO author_followers (client_id, following, updated_at, device_info) VALUES (?, 1, NOW(), ?)'
            )->execute([$clientId, $device]);
        }
    } else {
        $db->prepare('DELETE FROM author_followers WHERE client_id = ?')->execute([$clientId]);
    }

    $count       = (int)$db->query('SELECT COUNT(*) FROM author_followers')->fetchColumn();
    $isFollowing = $follow;
    jsonResponse(['totalFollowers' => $count, 'isFollowing' => $isFollowing]);
}

errorResponse('Method not allowed', 405);
