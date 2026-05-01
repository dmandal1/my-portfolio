<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDb();

function quoteIdent(string $name): string {
    return '`' . str_replace('`', '``', $name) . '`';
}

function tableExists(PDO $db, string $dbName, string $table): bool {
    $exists = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?");
    $exists->execute([$dbName, $table]);
    return (bool) $exists->fetchColumn();
}

function ensureAuditTable(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS admin_audit_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(80) NOT NULL,
            target VARCHAR(255) DEFAULT '',
            details_json LONGTEXT,
            ip_address VARCHAR(64) DEFAULT '',
            user_agent VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_action (action)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function logAdminAction(PDO $db, string $action, string $target = '', array $details = []): void {
    try {
        ensureAuditTable($db);
        $stmt = $db->prepare(
            'INSERT INTO admin_audit_events (action, target, details_json, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $action,
            $target,
            json_encode($details),
            $_SERVER['REMOTE_ADDR'] ?? '',
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        ]);
    } catch (\Throwable $e) {
        // Audit logging must not block maintenance actions.
    }
}

function getRecentAudit(PDO $db): array {
    try {
        ensureAuditTable($db);
        $rows = $db->query(
            "SELECT id, action, target, details_json, ip_address, created_at
             FROM admin_audit_events
             ORDER BY created_at DESC
             LIMIT 5"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $details = json_decode($row['details_json'] ?? '', true) ?: [];
            $row['can_restore'] = isset($details['restore_sql']);
            unset($details['restore_sql']); // Don't send large payload to frontend
            $row['details'] = $details;
            unset($row['details_json']);
        }
        unset($row);
        return $rows;
    } catch (\Throwable $e) {
        return [];
    }
}

function safeUploadPath(string $relativePath): ?string {
    $base = realpath(UPLOADS_DIR);
    if ($base === false) return null;

    $base = rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $relativePath = ltrim(str_replace(["\0", '\\'], ['', '/'], $relativePath), '/');
    if ($relativePath === '' || str_contains($relativePath, '..')) return null;

    $path = $base . $relativePath;
    $real = realpath($path);
    if ($real === false || !str_starts_with($real, $base) || !is_file($real)) {
        return null;
    }

    return $real;
}

function getUploadInventory(PDO $db): array {
    $rows = $db->query('SELECT file_path FROM media_files')->fetchAll(PDO::FETCH_ASSOC);
    $base = realpath(UPLOADS_DIR);
    $base = $base === false ? null : rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $referenced = [];
    $missing = 0;
    $diskFiles = 0;
    $orphanFiles = 0;
    $orphanBytes = 0;

    foreach ($rows as $row) {
        $filePath = trim((string)($row['file_path'] ?? ''));
        if ($filePath === '') {
            $missing++;
            continue;
        }

        $diskPath = safeUploadPath($filePath);
        if ($diskPath === null) {
            $missing++;
            continue;
        }

        $referenced[$diskPath] = true;
    }

    if ($base !== null && is_dir($base)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($files as $file) {
            if (!$file->isFile()) continue;

            $diskPath = $file->getRealPath();
            if ($diskPath === false || !str_starts_with($diskPath, $base)) {
                continue;
            }

            $diskFiles++;
            if (!isset($referenced[$diskPath])) {
                $orphanFiles++;
                $orphanBytes += $file->getSize();
            }
        }
    }

    return [
        'referenced_files' => count($rows),
        'disk_files' => $diskFiles,
        'missing_files' => $missing,
        'orphan_files' => $orphanFiles,
        'orphan_kb' => round($orphanBytes / 1024, 2),
    ];
}

function deleteMediaUploads(PDO $db): array {
    $rows = $db->query('SELECT file_path FROM media_files')->fetchAll(PDO::FETCH_ASSOC);
    $base = realpath(UPLOADS_DIR);
    $base = $base === false ? null : rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $deleted = 0;
    $missing = 0;
    $failed = [];
    $seen = [];

    foreach ($rows as $row) {
        $filePath = trim((string)($row['file_path'] ?? ''));
        if ($filePath === '') {
            $missing++;
            continue;
        }

        $diskPath = safeUploadPath($filePath);
        if ($diskPath === null) {
            $missing++;
            continue;
        }

        $seen[$diskPath] = true;
        if (@unlink($diskPath)) {
            $deleted++;
        } else {
            $failed[] = $filePath;
        }
    }

    if ($base !== null && is_dir($base)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($files as $file) {
            if (!$file->isFile()) continue;

            $diskPath = $file->getRealPath();
            if ($diskPath === false || isset($seen[$diskPath]) || !str_starts_with($diskPath, $base)) {
                continue;
            }

            $relativePath = substr($diskPath, strlen($base));
            if (@unlink($diskPath)) {
                $deleted++;
            } else {
                $failed[] = $relativePath;
            }
        }
    }

    return ['deleted' => $deleted, 'missing' => $missing, 'failed' => $failed];
}

function buildBackupSql(PDO $db, string $dbName, array $tables): string {
    $sql  = "-- Portfolio CMS Database Backup\n";
    $sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Database: $dbName\n";
    $sql .= "-- Tables: " . implode(', ', $tables) . "\n\n";
    $sql .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

    foreach ($tables as $table) {
        $quotedTable = quoteIdent($table);

        $createRow = $db->query("SHOW CREATE TABLE $quotedTable")->fetch(\PDO::FETCH_NUM);
        $sql .= "-- --------------------------------------------------------\n";
        $sql .= "-- Table: `$table`\n";
        $sql .= "-- --------------------------------------------------------\n\n";
        $sql .= "DROP TABLE IF EXISTS $quotedTable;\n";
        $sql .= $createRow[1] . ";\n\n";

        $rows = $db->query("SELECT * FROM $quotedTable")->fetchAll(\PDO::FETCH_ASSOC);
        if (count($rows) > 0) {
            $cols = '`' . implode('`, `', array_map(fn ($col) => str_replace('`', '``', $col), array_keys($rows[0]))) . '`';
            $chunks = array_chunk($rows, 100);
            foreach ($chunks as $chunk) {
                $values = [];
                foreach ($chunk as $row) {
                    $vals = array_map(function ($v) use ($db) {
                        if ($v === null) return 'NULL';
                        if (is_numeric($v) && !preg_match('/^0\d/', (string)$v)) return $v;
                        return $db->quote($v);
                    }, array_values($row));
                    $values[] = '(' . implode(', ', $vals) . ')';
                }
                $sql .= "INSERT INTO $quotedTable ($cols) VALUES\n" . implode(",\n", $values) . ";\n";
            }
            $sql .= "\n";
        }
    }

    $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    return $sql;
}

// ── GET: stats ─────────────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'stats') {
    $version = $db->query('SELECT VERSION() AS v')->fetchColumn();
    $dbName  = $db->query('SELECT DATABASE() AS d')->fetchColumn();

    // Table stats via information_schema
    $stmt = $db->prepare("
        SELECT
            TABLE_NAME        AS name,
            TABLE_ROWS        AS rows_approx,
            ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS size_kb,
            AUTO_INCREMENT    AS auto_inc,
            TABLE_COMMENT     AS comment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
    ");
    $stmt->execute([$dbName]);
    $tables = $stmt->fetchAll();

    // Exact row counts for small tables
    foreach ($tables as &$t) {
        try {
            $t['row_count'] = (int) $db->query("SELECT COUNT(*) FROM `{$t['name']}`")->fetchColumn();
        } catch (\Throwable $e) {
            $t['row_count'] = (int) $t['rows_approx'];
        }
    }
    unset($t);

    // Total DB size
    $sizeStmt = $db->prepare("
        SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS total_kb
        FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?
    ");
    $sizeStmt->execute([$dbName]);
    $totalKb = (float) $sizeStmt->fetchColumn();

    jsonResponse([
        'version'  => $version,
        'database' => $dbName,
        'total_kb' => $totalKb,
        'tables'   => $tables,
        'uploads'  => getUploadInventory($db),
        'audit'    => getRecentAudit($db),
    ]);
}

// ── POST: optimize ─────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'optimize') {
    $dbName = $db->query('SELECT DATABASE()')->fetchColumn();
    $tables = $db->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN);
    $results = [];
    foreach ($tables as $table) {
        try {
            $db->exec("OPTIMIZE TABLE " . quoteIdent($table));
            $results[] = ['table' => $table, 'status' => 'ok'];
        } catch (\Throwable $e) {
            $results[] = ['table' => $table, 'status' => 'error', 'msg' => $e->getMessage()];
        }
    }
    logAdminAction($db, 'database.optimize', 'all', ['optimized' => count($results)]);
    jsonResponse(['optimized' => count($results), 'results' => $results]);
}

// ── POST: truncate ─────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'truncate') {
    $protected = ['admin_users', 'admin_settings', 'admin_audit_events'];
    $table     = trim($_GET['table'] ?? '');

    if (!$table) errorResponse('Missing table name', 400);
    if (in_array($table, $protected, true)) errorResponse("Cannot truncate protected table '$table'", 403);

    // Verify the table actually exists in this database before executing
    $dbName = $db->query('SELECT DATABASE()')->fetchColumn();
    if (!tableExists($db, $dbName, $table)) errorResponse("Table '$table' does not exist", 404);

    // Create a backup of the table before truncating
    $backupSql = buildBackupSql($db, $dbName, [$table]);
    $encodedBackup = base64_encode($backupSql);

    $mediaCleanup = null;
    if ($table === 'media_files') {
        $mediaCleanup = deleteMediaUploads($db);
        if (!empty($mediaCleanup['failed'])) {
            errorResponse(
                'Could not delete one or more uploaded media files: ' . implode(', ', $mediaCleanup['failed']),
                500
            );
        }
    }

    try {
        $db->exec("TRUNCATE TABLE " . quoteIdent($table));
    } catch (\PDOException $e) {
        // TRUNCATE fails if referenced by a foreign key (e.g., blogs <- comments). 
        // Fallback to DELETE which respects ON DELETE CASCADE.
        $db->exec("DELETE FROM " . quoteIdent($table));
    }
    logAdminAction($db, 'database.truncate', $table, [
        'media_cleanup' => $mediaCleanup,
        'restore_sql' => $encodedBackup
    ]);
    jsonResponse(['ok' => true, 'table' => $table, 'media_cleanup' => $mediaCleanup]);
}

// ── POST: backup ───────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'backup') {
    $dbName = $db->query('SELECT DATABASE()')->fetchColumn();
    $table = trim($_GET['table'] ?? '');

    if ($table !== '') {
        if (!tableExists($db, $dbName, $table)) errorResponse("Table '$table' does not exist", 404);
        $tables = [$table];
    } else {
        $tables = $db->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN);
    }

    $sql = buildBackupSql($db, $dbName, $tables);
    $filePrefix = $table !== '' ? 'portfolio_table_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $table) : 'portfolio_backup';
    logAdminAction($db, 'database.backup', $table !== '' ? $table : 'all', ['tables' => $tables]);

    header('Content-Type: application/sql');
    header('Content-Disposition: attachment; filename="' . $filePrefix . '_' . date('Ymd_His') . '.sql"');
    header('Content-Length: ' . strlen($sql));
    echo $sql;
    exit;
}

// ── POST: restore ──────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'restore') {
    $auditId = (int)($_GET['id'] ?? 0);
    if (!$auditId) errorResponse('Missing audit ID', 400);

    $stmt = $db->prepare("SELECT details_json, target FROM admin_audit_events WHERE id = ? AND action = 'database.truncate'");
    $stmt->execute([$auditId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) errorResponse('Audit event not found or not a truncate action', 404);

    $details = json_decode($event['details_json'] ?? '', true) ?: [];
    if (empty($details['restore_sql'])) {
        errorResponse('No restore data available for this event', 404);
    }

    $sql = base64_decode($details['restore_sql']);
    if (!$sql) errorResponse('Invalid restore data', 500);

    try {
        $db->exec($sql);
    } catch (\Throwable $e) {
        errorResponse('Restore failed: ' . $e->getMessage(), 500);
    }

    logAdminAction($db, 'database.restore', $event['target'], ['restored_from_audit_id' => $auditId]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method or action not allowed', 405);
