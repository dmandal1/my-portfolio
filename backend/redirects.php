<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

// Ensure table exists
$db->exec("
    CREATE TABLE IF NOT EXISTS redirects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_path VARCHAR(255) NOT NULL,
        to_path VARCHAR(255) NOT NULL,
        type VARCHAR(10) DEFAULT '301',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_from_path (from_path)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// ── GET: list redirects ────────────────────────────────────────────────────
if ($method === 'GET') {
    $rows = $db->query('SELECT * FROM redirects ORDER BY created_at DESC')->fetchAll();
    jsonResponse($rows);
}

// ── POST: create redirect ──────────────────────────────────────────────────
if ($method === 'POST') {
    $data = getRequestBody();
    $from = trim($data['from_path'] ?? '');
    $to   = trim($data['to_path'] ?? '');
    $type = trim($data['type'] ?? '301');
    $note = trim($data['note'] ?? '');

    if (!$from || !$to) errorResponse('Missing paths');

    $stmt = $db->prepare('INSERT INTO redirects (from_path, to_path, type, note) VALUES (?, ?, ?, ?)');
    $stmt->execute([$from, $to, $type, $note]);
    jsonResponse(['id' => $db->lastInsertId()]);
}

// ── PUT: update redirect ───────────────────────────────────────────────────
if ($method === 'PUT') {
    $id   = $_GET['id'] ?? '';
    if (!$id) errorResponse('Missing id');

    $data = getRequestBody();
    $from = trim($data['from_path'] ?? '');
    $to   = trim($data['to_path'] ?? '');
    $type = trim($data['type'] ?? '301');
    $note = trim($data['note'] ?? '');

    if (!$from || !$to) errorResponse('Missing paths');

    $stmt = $db->prepare('UPDATE redirects SET from_path = ?, to_path = ?, type = ?, note = ? WHERE id = ?');
    $stmt->execute([$from, $to, $type, $note, $id]);
    jsonResponse(['ok' => true]);
}

// ── DELETE: remove redirect ────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) errorResponse('Missing id');

    $stmt = $db->prepare('DELETE FROM redirects WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
