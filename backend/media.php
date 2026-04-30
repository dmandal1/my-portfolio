<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

$allowedMime = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/svg+xml',
];

function ensureDir(string $dir): void {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// ── GET: list all media ────────────────────────────────────────────────────
if ($method === 'GET') {
    requireAuth();
    $folder = $_GET['folder'] ?? '';

    $stmt = $folder
        ? $db->prepare('SELECT * FROM media_files WHERE folder = ? ORDER BY created_at DESC')
        : $db->query('SELECT * FROM media_files ORDER BY created_at DESC');

    if ($folder) {
        $stmt->execute([$folder]);
    }

    jsonResponse($stmt->fetchAll());
}

// ── POST: upload a file ────────────────────────────────────────────────────
if ($method === 'POST') {
    requireAuth();

    if (empty($_FILES['file'])) {
        errorResponse('No file uploaded');
    }

    $file   = $_FILES['file'];
    $folder = $_POST['folder'] ?? 'blog-covers';

    if ($file['error'] !== UPLOAD_ERR_OK) {
        errorResponse('Upload failed with error code ' . $file['error']);
    }

    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowedMime, true)) {
        errorResponse('File type not allowed. Only images are accepted.');
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        errorResponse('File too large. Max 10 MB.');
    }

    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $safeName = time() . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
    $dir      = UPLOADS_DIR . $folder . '/';
    ensureDir($dir);

    $destPath = $dir . $safeName;
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        errorResponse('Failed to save file', 500);
    }

    $url     = UPLOADS_URL . $folder . '/' . $safeName;
    $fileRel = $folder . '/' . $safeName;
    $now     = date('Y-m-d H:i:s');

    $db->prepare(
        'INSERT INTO media_files (file_name, file_path, url, file_size, content_type, folder, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$file['name'], $fileRel, $url, $file['size'], $mime, $folder, $now]);

    $id = $db->lastInsertId();
    jsonResponse(['id' => $id, 'url' => $url, 'name' => $safeName, 'fullPath' => $fileRel]);
}

// ── DELETE: delete a file ──────────────────────────────────────────────────
if ($method === 'DELETE') {
    requireAuth();
    $id       = $_GET['id']        ?? '';
    $fullPath = $_GET['full_path'] ?? '';

    if (!$id && !$fullPath) errorResponse('Missing id or full_path');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM media_files WHERE id = ?');
        $stmt->execute([$id]);
    } else {
        $stmt = $db->prepare('SELECT * FROM media_files WHERE file_path = ?');
        $stmt->execute([$fullPath]);
    }

    $row = $stmt->fetch();
    if (!$row) errorResponse('File not found', 404);

    $diskPath = UPLOADS_DIR . $row['file_path'];
    if (file_exists($diskPath)) {
        unlink($diskPath);
    }

    $db->prepare('DELETE FROM media_files WHERE id = ?')->execute([$row['id']]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
