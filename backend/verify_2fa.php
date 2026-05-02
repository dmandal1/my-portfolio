<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/2fa.php'; // For TOTP class

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// We expect a temporary token in the header
$payload = requireAuth();

if (!isset($payload['pending_2fa']) || !$payload['pending_2fa']) {
    errorResponse('Invalid session state', 403);
}

$body = getRequestBody();
$code = trim($body['code'] ?? '');

if (!$code) {
    errorResponse('Verification code is required');
}

$db   = getDb();
$stmt = $db->prepare('SELECT id, email, two_factor_otp, two_factor_otp_expiry, created_at FROM admin_users WHERE id = ? LIMIT 1');
$stmt->execute([$payload['sub']]);
$user = $stmt->fetch();

if (!$user) {
    errorResponse('User not found', 404);
}

// Check OTP and Expiry
if ($user['two_factor_otp'] === $code && strtotime($user['two_factor_otp_expiry']) > time()) {
    // Clear OTP after success
    $db->prepare('UPDATE admin_users SET two_factor_otp = "", two_factor_otp_expiry = NULL WHERE id = ?')
       ->execute([$user['id']]);

    // Verification successful, return the real token
    $token = createJwt([
        'sub'   => $user['id'],
        'email' => $user['email'],
        'iat'   => time(),
        'exp'   => time() + JWT_TTL,
        'created_at' => $user['created_at']
    ]);
    jsonResponse(['token' => $token, 'email' => $user['email']]);
} else {
    errorResponse('Invalid or expired verification code', 401);
}
