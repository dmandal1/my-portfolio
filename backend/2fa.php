<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDb();

// ── TOTP Helper Class ──────────────────────────────────────────────────────
class TOTP {
    private static $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret($length = 16) {
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::$base32Chars[random_int(0, 31)];
        }
        return $secret;
    }

    public static function getCode($secret, $timeSlice = null) {
        if ($timeSlice === null) $timeSlice = floor(time() / 30);
        $secretKey = self::base32Decode($secret);
        
        $time = pack('N*', 0) . pack('N*', $timeSlice);
        $hmac = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord($hmac[19]) & 0xf;
        $hash = (
            (ord($hmac[$offset + 0]) & 0x7f) << 24 |
            (ord($hmac[$offset + 1]) & 0xff) << 16 |
            (ord($hmac[$offset + 2]) & 0xff) << 8 |
            (ord($hmac[$offset + 3]) & 0xff)
        ) % 1000000;

        return str_pad($hash, 6, '0', STR_PAD_LEFT);
    }

    public static function verifyCode($secret, $code, $discrepancy = 1) {
        $currentTimeSlice = floor(time() / 30);
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            if (self::getCode($secret, $currentTimeSlice + $i) === $code) {
                return true;
            }
        }
        return false;
    }

    private static function base32Decode($base32) {
        $base32 = strtoupper($base32);
        if (!preg_match('/^[A-Z2-7]+$/', $base32)) return '';
        $base32Chars = self::$base32Chars;
        $decoded = '';
        $buffer = 0;
        $bufferSize = 0;
        for ($i = 0; $i < strlen($base32); $i++) {
            $buffer = ($buffer << 5) | strpos($base32Chars, $base32[$i]);
            $bufferSize += 5;
            if ($bufferSize >= 8) {
                $bufferSize -= 8;
                $decoded .= chr(($buffer >> $bufferSize) & 0xff);
            }
        }
        return $decoded;
    }
}

// ── Self-healing: Ensure 2FA columns exist ───────────────────────────────
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
ensureColumn($db, 'admin_users', 'profile_image', "VARCHAR(500) DEFAULT '' AFTER password_hash");
ensureColumn($db, 'admin_users', 'two_factor_secret', "VARCHAR(100) DEFAULT '' AFTER profile_image");
ensureColumn($db, 'admin_users', 'two_factor_enabled', "TINYINT(1) DEFAULT 0 AFTER two_factor_secret");

// ── Actions ────────────────────────────────────────────────────────────────

if (basename($_SERVER['SCRIPT_FILENAME']) === '2fa.php') {
    if ($method === 'GET' && $action === 'generate') {
        $secret = TOTP::generateSecret();
        $email  = $user['email'];
        $issuer = 'PortfolioAdmin';
        $qrUrl  = "otpauth://totp/{$issuer}:{$email}?secret={$secret}&issuer={$issuer}";

        jsonResponse(['secret' => $secret, 'qrUrl' => $qrUrl]);
    }

    if ($method === 'POST' && $action === 'enable') {
        $data   = getRequestBody();
        $secret = trim($data['secret'] ?? '');
        $code   = trim($data['code'] ?? '');

        if (!$secret || !$code) errorResponse('Secret and verification code are required');

        if (TOTP::verifyCode($secret, $code)) {
            $stmt = $db->prepare('UPDATE admin_users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?');
            $stmt->execute([$secret, $user['sub']]);
            jsonResponse(['ok' => true]);
        } else {
            errorResponse('Invalid verification code. Please try again.', 400);
        }
    }

    if ($method === 'POST' && $action === 'disable') {
        $stmt = $db->prepare('UPDATE admin_users SET two_factor_secret = "", two_factor_enabled = 0 WHERE id = ?');
        $stmt->execute([$user['sub']]);
        jsonResponse(['ok' => true]);
    }

    errorResponse('Method or action not allowed', 405);
}
