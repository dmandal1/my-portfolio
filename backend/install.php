<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

$configPath = __DIR__ . '/config.php';
$lockPath   = dirname(__DIR__) . '/installed.lock';

function out($data, $code = 200): never {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Already installed guard
if (file_exists($lockPath) && file_exists($configPath)) {
    out(['error' => 'Already installed. Delete installed.lock from public_html to reinstall.'], 403);
}

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? 'install'; // 'test_db' | 'install'

$dbHost = trim($body['db_host'] ?? 'localhost');
$dbName = trim($body['db_name'] ?? '');
$dbUser = trim($body['db_user'] ?? '');
$dbPass = $body['db_pass'] ?? '';

if (!$dbName || !$dbUser) {
    out(['error' => 'Database name and username are required.'], 400);
}

// ── Test DB connection ─────────────────────────────────────────────────────
function testConnection(string $host, string $name, string $user, string $pass): PDO|string {
    try {
        return new PDO(
            "mysql:host=$host;dbname=$name;charset=utf8mb4",
            $user, $pass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
        );
    } catch (PDOException $e) {
        return $e->getMessage();
    }
}

$pdo = testConnection($dbHost, $dbName, $dbUser, $dbPass);
if (is_string($pdo)) {
    out(['error' => 'Database connection failed: ' . $pdo], 400);
}

// Test-only mode — just verify credentials
if ($action === 'test_db') {
    out(['ok' => true, 'message' => 'Connection successful!']);
}

// ── Full install ───────────────────────────────────────────────────────────
$adminEmail = trim($body['admin_email']    ?? '');
$adminPass  = trim($body['admin_password'] ?? '');
$siteName   = trim($body['site_name']      ?? 'My Portfolio');
$jwtSecret  = bin2hex(random_bytes(32));

if (!$adminEmail) out(['error' => 'Admin email is required.'], 400);
if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) out(['error' => 'Invalid admin email address.'], 400);
if (strlen($adminPass) < 8) out(['error' => 'Password must be at least 8 characters.'], 400);

// Writable check
if (!is_writable(__DIR__)) {
    out(['error' => 'api/ directory is not writable. Run: chmod 755 public_html/api'], 500);
}
if (!is_writable(dirname(__DIR__))) {
    out(['error' => 'public_html/ directory is not writable. Run: chmod 755 public_html'], 500);
}

// ── Create tables ──────────────────────────────────────────────────────────
$statements = [
"CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS blogs (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL DEFAULT '',
    subtitle VARCHAR(500) DEFAULT '',
    slug VARCHAR(500) UNIQUE,
    content LONGTEXT,
    excerpt TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    image_alt VARCHAR(500) DEFAULT '',
    published TINYINT(1) DEFAULT 0,
    featured TINYINT(1) DEFAULT 0,
    allow_comments TINYINT(1) DEFAULT 1,
    pending_review TINYINT(1) DEFAULT 0,
    category_id VARCHAR(36) DEFAULT NULL,
    category_ids JSON DEFAULT NULL,
    tags TEXT DEFAULT '',
    tag_ids JSON DEFAULT NULL,
    meta_title VARCHAR(500) DEFAULT '',
    meta_description TEXT DEFAULT '',
    canonical_url VARCHAR(500) DEFAULT '',
    difficulty VARCHAR(50) DEFAULT 'intermediate',
    audience TEXT DEFAULT '',
    prerequisites TEXT DEFAULT '',
    repo_url VARCHAR(500) DEFAULT '',
    demo_url VARCHAR(500) DEFAULT '',
    series VARCHAR(255) DEFAULT '',
    views INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    last_commented_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(36) PRIMARY KEY,
    blog_id VARCHAR(36) NOT NULL,
    name VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    parent_id VARCHAR(36) DEFAULT NULL,
    reply_to_name VARCHAR(80) DEFAULT NULL,
    is_author_reply TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blog_id (blog_id),
    CONSTRAINT fk_comments_blog FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id VARCHAR(36) DEFAULT NULL,
    description TEXT DEFAULT '',
    post_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    post_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings_json LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS admin_audit_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(80) NOT NULL,
    target VARCHAR(255) DEFAULT '',
    details_json LONGTEXT,
    ip_address VARCHAR(64) DEFAULT '',
    user_agent VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS author_followers (
    client_id VARCHAR(255) PRIMARY KEY,
    following TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    device_info JSON DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS author_ratings (
    client_id VARCHAR(255) PRIMARY KEY,
    value TINYINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    device_info JSON DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS portfolio_sections (
    section_name VARCHAR(100) PRIMARY KEY,
    data_json LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS portfolio_items (
    id VARCHAR(36) PRIMARY KEY,
    collection_name VARCHAR(100) NOT NULL,
    order_index INT DEFAULT 0,
    data_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collection (collection_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS media_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    url VARCHAR(500) NOT NULL,
    file_size INT DEFAULT 0,
    content_type VARCHAR(100) DEFAULT '',
    folder VARCHAR(100) DEFAULT 'uploads',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

foreach ($statements as $sql) {
    try {
        $pdo->exec($sql);
    } catch (PDOException $e) {
        out(['error' => 'Failed to create tables: ' . $e->getMessage()], 500);
    }
}

// ── Create admin user ──────────────────────────────────────────────────────
$existing = $pdo->prepare('SELECT id FROM admin_users WHERE email = ?');
$existing->execute([$adminEmail]);

if (!$existing->fetch()) {
    $hash = password_hash($adminPass, PASSWORD_BCRYPT);
    $pdo->prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)')->execute([$adminEmail, $hash]);
}

// ── Save initial admin settings (site name) ────────────────────────────────
$initSettings = json_encode(['siteName' => $siteName, 'installed' => true]);
$pdo->prepare('INSERT INTO admin_settings (id, settings_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings_json = ?')
    ->execute([$initSettings, $initSettings]);

// ── Write config.php ───────────────────────────────────────────────────────
$escapedHost  = addslashes($dbHost);
$escapedName  = addslashes($dbName);
$escapedUser  = addslashes($dbUser);
$escapedPass  = addslashes($dbPass);
$escapedSite  = addslashes($siteName);

$configContent = <<<PHP
<?php
define('DB_HOST', '$escapedHost');
define('DB_NAME', '$escapedName');
define('DB_USER', '$escapedUser');
define('DB_PASS', '$escapedPass');

define('JWT_SECRET', '$jwtSecret');
define('JWT_TTL', 86400 * 7); // 7 days

define('UPLOADS_DIR', __DIR__ . '/../uploads/');
define('UPLOADS_URL', '/uploads/');

function getDb(): PDO {
    static \$pdo = null;
    if (\$pdo === null) {
        \$pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return \$pdo;
}

function generateUuid(): string {
    \$data = random_bytes(16);
    \$data[6] = chr(ord(\$data[6]) & 0x0f | 0x40);
    \$data[8] = chr(ord(\$data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(\$data), 4));
}

function jsonResponse(array \$data, int \$code = 200): never {
    http_response_code(\$code);
    echo json_encode(\$data);
    exit;
}

function errorResponse(string \$message, int \$code = 400): never {
    jsonResponse(['error' => \$message], \$code);
}

function getRequestBody(): array {
    \$raw = file_get_contents('php://input');
    if (!\$raw) return [];
    \$decoded = json_decode(\$raw, true);
    return is_array(\$decoded) ? \$decoded : [];
}
PHP;

if (file_put_contents($configPath, $configContent) === false) {
    out(['error' => 'Failed to write config.php. Check permissions on api/ directory.'], 500);
}

// ── Create uploads directories ─────────────────────────────────────────────
$uploadsBase = dirname(__DIR__) . '/uploads/';
@mkdir($uploadsBase . 'blog-covers',       0755, true);
@mkdir($uploadsBase . 'portfolio-assets',  0755, true);

// ── Write installed.lock ───────────────────────────────────────────────────
file_put_contents($lockPath, date('Y-m-d H:i:s') . "\nSite: $escapedSite\nAdmin: $adminEmail\n");

out(['success' => true, 'message' => 'Installation complete! You can now log in.']);
