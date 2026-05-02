<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

if ($method === 'POST') {
    $data = getRequestBody();
    
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
    ensureColumn($db, 'admin_users', 'profile_image', "VARCHAR(500) DEFAULT '' AFTER password_hash");
    ensureColumn($db, 'admin_users', 'display_name', "VARCHAR(255) DEFAULT '' AFTER profile_image");
    ensureColumn($db, 'admin_users', 'bio', "TEXT AFTER display_name");
    ensureColumn($db, 'admin_users', 'social_links', "TEXT AFTER bio");
    ensureColumn($db, 'admin_users', 'two_factor_secret', "VARCHAR(100) DEFAULT '' AFTER social_links");
    ensureColumn($db, 'admin_users', 'two_factor_enabled', "TINYINT(1) DEFAULT 0 AFTER two_factor_secret");

    // ── Prepare Data ──────────────────────────────────────────────────────
    $profileImage = trim($data['profile_image'] ?? '');
    $displayName  = trim($data['display_name'] ?? '');
    $bio          = trim($data['bio'] ?? '');
    $socialLinks  = is_array($data['social_links'] ?? null) ? json_encode($data['social_links']) : trim($data['social_links'] ?? '');

    // ── Update profile ──────────────────────────────────────────────────────
    $sql = 'UPDATE admin_users SET profile_image = ?, display_name = ?, bio = ?, social_links = ? WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute([$profileImage, $displayName, $bio, $socialLinks, $user['sub']]);

    jsonResponse([
        'ok' => true,
        'profile_image' => $profileImage,
        'display_name'  => $displayName,
        'bio'           => $bio,
        'social_links'  => $socialLinks
    ]);
}

errorResponse('Method not allowed', 405);
