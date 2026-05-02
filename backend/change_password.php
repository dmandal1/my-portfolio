<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$payload = requireAuth();
$userId = $payload['sub'];

$body = getRequestBody();
$oldPassword = $body['oldPassword'] ?? '';
$newPassword = $body['newPassword'] ?? '';

if (!$oldPassword || !$newPassword) {
    errorResponse('Both old and new passwords are required');
}

$db = getDb();
$stmt = $db->prepare('SELECT password_hash FROM admin_users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || !password_verify($oldPassword, $user['password_hash'])) {
    errorResponse('Incorrect current password', 400);
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
$stmt = $db->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?');
$stmt->execute([$newHash, $userId]);



jsonResponse(['success' => true]);
