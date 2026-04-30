<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$body     = getRequestBody();
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if (!$email || !$password) {
    errorResponse('Email and password are required');
}

$db   = getDb();
$stmt = $db->prepare('SELECT id, email, password_hash FROM admin_users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    errorResponse('Invalid email or password', 401);
}

$token = createJwt([
    'sub' => $user['id'],
    'email' => $user['email'],
    'iat' => time(),
    'exp' => time() + JWT_TTL,
]);

jsonResponse(['token' => $token, 'email' => $user['email']]);
