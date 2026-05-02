<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$user = requireAuth();
$db   = getDb();

// ── Self-healing: Ensure columns exist ────────────────────────────────────
if (!function_exists('ensureColumn')) {
    function ensureColumn($db, $table, $column, $definition) {
        try {
            $db->query("SELECT $column FROM $table LIMIT 1");
        } catch (PDOException $e) {
            if ($e->getCode() === '42S22') {
                try {
                    $db->exec("ALTER TABLE $table ADD COLUMN $column $definition");
                } catch (PDOException $alterError) {
                    // Ignore error if column exists or other DDL issues
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

$stmt = $db->prepare('SELECT id, email, display_name, bio, social_links, profile_image, two_factor_enabled, created_at FROM admin_users WHERE id = ? LIMIT 1');
$stmt->execute([$user['sub']]);
$userData = $stmt->fetch();

if (!$userData) {
    errorResponse('User not found', 404);
}

// Clean up: profile_image might be NULL or empty
$userData['profile_image'] = $userData['profile_image'] ?: '';
$userData['display_name']  = $userData['display_name'] ?: '';
$userData['bio']           = $userData['bio'] ?: '';
$userData['social_links']  = $userData['social_links'] ?: '';
$userData['two_factor_enabled'] = (bool)$userData['two_factor_enabled'];

jsonResponse($userData);
