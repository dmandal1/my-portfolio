<?php
require_once __DIR__ . '/cors.php';

// Default simple status (public)
$action = $_GET['action'] ?? '';
if ($action !== 'health') {
    $configPath = __DIR__ . '/config.php';
    $lockPath   = __DIR__ . '/../installed.lock';
    // Check if config.php is a real config (not the 503 placeholder)
    $installed = false;
    if (file_exists($configPath) && file_exists($lockPath)) {
        $content = file_get_contents($configPath);
        if (strpos($content, 'http_response_code(503)') === false) {
            $installed = true;
        }
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['installed' => $installed]);
    exit;
}

require_once __DIR__ . '/config.php';

// Detailed health (admin only)
require_once __DIR__ . '/jwt_helper.php';
requireAuth();

$db = getDb();
$mysql_version = $db->query('SELECT VERSION()')->fetchColumn();

// Helper to get formatted size
function get_dir_size($directory) {
    $size = 0;
    if (!is_dir($directory)) return 0;
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory)) as $file) {
        $size += $file->getSize();
    }
    return $size;
}

$uploads_size = get_dir_size(__DIR__ . '/../uploads');

echo json_encode([
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'mysql_version' => $mysql_version,
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'os' => PHP_OS,
    'uploads_directory_size' => round($uploads_size / (1024 * 1024), 2) . " MB",
    'disk_free_space' => function_exists('disk_free_space') ? round(disk_free_space(__DIR__) / (1024 * 1024 * 1024), 2) . " GB" : 'Unknown',
    'time' => date('Y-m-d H:i:s'),
    'timezone' => date_default_timezone_get(),
]);
