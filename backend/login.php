<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/mail_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$body     = getRequestBody();
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if (!$email || !$password) {
    errorResponse('Email and password are required');
}

$db = getDb();

// ── Self-healing: Ensure columns exist ────────────────────────────────────
function ensureColumn($db, $table, $column, $definition) {
    try {
        $db->query("SELECT $column FROM $table LIMIT 1");
    } catch (PDOException $e) {
        if ($e->getCode() === '42S22') {
            try {
                $db->exec("ALTER TABLE $table ADD COLUMN $column $definition");
            } catch (PDOException $ex) {
                // Ignore
            }
        }
    }
}
ensureColumn($db, 'admin_users', 'profile_image', "VARCHAR(500) DEFAULT '' AFTER password_hash");
ensureColumn($db, 'admin_users', 'two_factor_secret', "VARCHAR(100) DEFAULT '' AFTER profile_image");
ensureColumn($db, 'admin_users', 'two_factor_enabled', "TINYINT(1) DEFAULT 0 AFTER two_factor_secret");

$stmt = $db->prepare('SELECT id, email, password_hash, two_factor_enabled, created_at FROM admin_users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    errorResponse('Invalid email or password', 401);
}

// ── 2FA Check ──
if ($user['two_factor_enabled']) {
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiry = date('Y-m-d H:i:s', time() + 600); // 10 minutes

    ensureColumn($db, 'admin_users', 'two_factor_otp', "VARCHAR(10) DEFAULT '' AFTER two_factor_enabled");
    ensureColumn($db, 'admin_users', 'two_factor_otp_expiry', "DATETIME DEFAULT NULL AFTER two_factor_otp");

    $stmt = $db->prepare('UPDATE admin_users SET two_factor_otp = ?, two_factor_otp_expiry = ? WHERE id = ?');
    $stmt->execute([$otp, $expiry, $user['id']]);

    // Send Email
    $host = $_SERVER['HTTP_HOST'];
    $subject = "Your Login Verification Code";
    $message = "
        <html>
        <body style='font-family: sans-serif; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                <h2 style='color: #1565C0;'>Login Verification</h2>
                <p>Your admin account has Two-Factor Authentication enabled. Use the code below to complete your login. This code expires in 10 minutes.</p>
                <div style='background: #f8fbff; border: 1px dashed #1565C0; padding: 20px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #1565C0; margin: 20px 0; border-radius: 8px;'>
                    {$otp}
                </div>
            </div>
        </body>
        </html>
    ";
    $sendResult = sendMail($user['email'], $subject, $message);
    
    // Return a temporary token for the 2FA step
    $tempToken = createJwt([
        'sub'   => $user['id'],
        'email' => $user['email'],
        'iat'   => time(),
        'exp'   => time() + 600, // 10 minutes
        'pending_2fa' => true
    ]);

    jsonResponse([
        'requires_2fa' => true,
        'temp_token'   => $tempToken,
        'email'        => $user['email']
    ]);
}

$token = createJwt([
    'sub'   => $user['id'],
    'email' => $user['email'],
    'iat'   => time(),
    'exp'   => time() + JWT_TTL,
    'created_at' => $user['created_at']
]);

jsonResponse(['token' => $token, 'email' => $user['email']]);
