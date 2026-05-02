<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/mail_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDb();

// ── Self-healing: Ensure columns exist ────────────────────────────────────
if (!function_exists('ensureColumn')) {
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
}
ensureColumn($db, 'admin_users', 'reset_token', "VARCHAR(100) DEFAULT '' AFTER two_factor_enabled");
ensureColumn($db, 'admin_users', 'reset_token_expiry', "DATETIME DEFAULT NULL AFTER reset_token");

if ($method === 'POST') {
    $body = getRequestBody();

    // 1. Request Reset
    if ($action === 'request') {
        $email = trim($body['email'] ?? '');
        if (!$email) errorResponse('Email is required.');

        $stmt = $db->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        $logFile = __DIR__ . '/mail_log.txt';
        $logMsg = date('[Y-m-d H:i:s]') . " --- Reset Request for {$email} ---\n";
        if (!$user) {
            $logMsg .= "DEBUG: User NOT found in database for email: {$email}\n";
        } else {
            $logMsg .= "DEBUG: User found (ID: {$user['id']})\n";
        }
        file_put_contents($logFile, $logMsg, FILE_APPEND);

        if (!$user) {
            errorResponse('This email address isn\'t registered with an admin account. Please double-check for any typos and try again.', 404);
        }

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = date('Y-m-d H:i:s', time() + 600); // 10 minutes for OTP

        $stmt = $db->prepare('UPDATE admin_users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?');
        $stmt->execute([$otp, $expiry, $user['id']]);

        // Send Email
        $host = $_SERVER['HTTP_HOST'];
        $subject = "Your Password Reset OTP";
        $message = "
            <html>
            <body style='font-family: sans-serif; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                    <h2 style='color: #1565C0;'>Password Reset OTP</h2>
                    <p>You requested a password reset. Use the 6-digit code below to reset your password. This code is valid for <strong>10 minutes</strong>.</p>
                    <div style='background: #f8fbff; border: 1px dashed #1565C0; padding: 20px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #1565C0; margin: 20px 0; border-radius: 8px;'>
                        {$otp}
                    </div>
                    <p style='font-size: 13px; color: #666;'>If you did not request this, please ignore this email and ensure your account is secure.</p>
                </div>
            </body>
            </html>
        ";

        $sendResult = sendMail($email, $subject, $message);

        if (!$sendResult) {
            errorResponse('Account verified, but the reset email couldn\'t be sent. Please try again.', 500);
        }

        jsonResponse(['success' => true, 'message' => 'OTP has been sent to your email!']);
    }

    // 2. Verify OTP (Step 2 of 3)
    if ($action === 'verify-otp') {
        $otp = trim($body['otp'] ?? '');
        if (!$otp) errorResponse('OTP is required.');

        $stmt = $db->prepare('SELECT id FROM admin_users WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1');
        $stmt->execute([$otp]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Invalid or expired OTP.', 400);
        }

        jsonResponse(['success' => true, 'message' => 'OTP verified. Please set your new password.']);
    }

    // 3. Reset Password (Step 3 of 3)
    if ($action === 'reset') {
        $otp = trim($body['otp'] ?? '');
        $password = $body['password'] ?? '';

        if (!$otp || !$password) errorResponse('OTP and new password are required.');
        if (strlen($password) < 8) errorResponse('Password must be at least 8 characters.');

        $stmt = $db->prepare('SELECT id FROM admin_users WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1');
        $stmt->execute([$otp]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Invalid or expired OTP.', 400);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('UPDATE admin_users SET password_hash = ?, reset_token = "", reset_token_expiry = NULL WHERE id = ?');
        $stmt->execute([$hash, $user['id']]);

        jsonResponse(['success' => true, 'message' => 'Password updated successfully. You can now login.']);
    }
}

errorResponse('Method or action not allowed', 405);
