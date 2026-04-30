<?php
/**
 * One-time setup script.
 * 1. Creates all database tables (schema.sql equivalent)
 * 2. Creates the initial admin user
 *
 * USAGE:
 *   Visit  https://deepakmandal.dev/api/setup.php?key=SETUP_KEY_HERE
 *   Replace SETUP_KEY_HERE with the value of SETUP_KEY below.
 *
 * DELETE OR RENAME THIS FILE after first run!
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';

// ── Change this key before uploading! ─────────────────────────────────────
define('SETUP_KEY', 'dm-setup-2024-secret');

if (($_GET['key'] ?? '') !== SETUP_KEY) {
    http_response_code(403);
    die(json_encode(['error' => 'Forbidden. Provide ?key=SETUP_KEY_HERE']));
}

$db  = getDb();
$log = [];

$tables = <<<'SQL'
CREATE TABLE IF NOT EXISTS admin_users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blogs (
    id               VARCHAR(36)   PRIMARY KEY,
    title            VARCHAR(500)  NOT NULL DEFAULT '',
    subtitle         VARCHAR(500)           DEFAULT '',
    slug             VARCHAR(500)  UNIQUE,
    content          LONGTEXT,
    excerpt          TEXT                   DEFAULT '',
    cover_image      TEXT                   DEFAULT '',
    image_alt        VARCHAR(500)           DEFAULT '',
    published        TINYINT(1)             DEFAULT 0,
    featured         TINYINT(1)             DEFAULT 0,
    allow_comments   TINYINT(1)             DEFAULT 1,
    pending_review   TINYINT(1)             DEFAULT 0,
    category_id      VARCHAR(36)            DEFAULT NULL,
    category_ids     JSON                   DEFAULT NULL,
    tags             TEXT                   DEFAULT '',
    tag_ids          JSON                   DEFAULT NULL,
    meta_title       VARCHAR(500)           DEFAULT '',
    meta_description TEXT                   DEFAULT '',
    canonical_url    VARCHAR(500)           DEFAULT '',
    difficulty       VARCHAR(50)            DEFAULT 'intermediate',
    audience         TEXT                   DEFAULT '',
    prerequisites    TEXT                   DEFAULT '',
    repo_url         VARCHAR(500)           DEFAULT '',
    demo_url         VARCHAR(500)           DEFAULT '',
    series           VARCHAR(255)           DEFAULT '',
    views            INT                    DEFAULT 0,
    comments_count   INT                    DEFAULT 0,
    last_commented_at TIMESTAMP             NULL,
    scheduled_at     TIMESTAMP              NULL,
    created_at       TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
    id              VARCHAR(36)  PRIMARY KEY,
    blog_id         VARCHAR(36)  NOT NULL,
    name            VARCHAR(80)  NOT NULL,
    message         TEXT         NOT NULL,
    parent_id       VARCHAR(36)  DEFAULT NULL,
    reply_to_name   VARCHAR(80)  DEFAULT NULL,
    is_author_reply TINYINT(1)   DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blog_id (blog_id),
    CONSTRAINT fk_comments_blog FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    parent_id   VARCHAR(36)  DEFAULT NULL,
    description TEXT         DEFAULT '',
    post_count  INT          DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tags (
    id         VARCHAR(36)  PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(255) NOT NULL UNIQUE,
    post_count INT          DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_settings (
    id            INT PRIMARY KEY DEFAULT 1,
    settings_json LONGTEXT,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS author_followers (
    client_id   VARCHAR(255) PRIMARY KEY,
    following   TINYINT(1)   DEFAULT 1,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    device_info JSON         DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS author_ratings (
    client_id   VARCHAR(255) PRIMARY KEY,
    value       TINYINT      NOT NULL,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    device_info JSON         DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS portfolio_sections (
    section_name VARCHAR(100) PRIMARY KEY,
    data_json    LONGTEXT,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS portfolio_items (
    id              VARCHAR(36)  PRIMARY KEY,
    collection_name VARCHAR(100) NOT NULL,
    order_index     INT          DEFAULT 0,
    data_json       LONGTEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collection (collection_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS media_files (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    file_name    VARCHAR(500) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    url          VARCHAR(500) NOT NULL,
    file_size    INT          DEFAULT 0,
    content_type VARCHAR(100) DEFAULT '',
    folder       VARCHAR(100) DEFAULT 'uploads',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

foreach (explode(';', $tables) as $sql) {
    $sql = trim($sql);
    if (!$sql) continue;
    try {
        $db->exec($sql);
        preg_match('/CREATE TABLE IF NOT EXISTS (\w+)/', $sql, $m);
        $log[] = '✓ Table: ' . ($m[1] ?? '?');
    } catch (PDOException $e) {
        $log[] = '✗ Error: ' . $e->getMessage();
    }
}

// ── Create admin user ──────────────────────────────────────────────────────
$adminEmail    = 'mdeepak.be16@gmail.com';
$adminPassword = $_GET['admin_password'] ?? 'ChangeMe@123';

$existing = $db->prepare('SELECT id FROM admin_users WHERE email = ?');
$existing->execute([$adminEmail]);
if ($existing->fetch()) {
    $log[] = '⚠ Admin user already exists: ' . $adminEmail;
} else {
    $hash = password_hash($adminPassword, PASSWORD_BCRYPT);
    $db->prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)')->execute([$adminEmail, $hash]);
    $log[] = '✓ Admin user created: ' . $adminEmail;
    $log[] = '  Password: ' . $adminPassword . '  ← CHANGE THIS IMMEDIATELY';
}

// ── Create uploads directories ─────────────────────────────────────────────
$dirs = [
    UPLOADS_DIR,
    UPLOADS_DIR . 'blog-covers/',
    UPLOADS_DIR . 'portfolio-assets/',
];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
        $log[] = '✓ Created dir: ' . $dir;
    } else {
        $log[] = '⚠ Dir exists: ' . $dir;
    }
}

header('Content-Type: application/json');
echo json_encode(['status' => 'done', 'log' => $log], JSON_PRETTY_PRINT);
