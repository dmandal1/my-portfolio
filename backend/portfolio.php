<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

$section    = $_GET['section']    ?? '';
$collection = $_GET['collection'] ?? '';
$id         = $_GET['id']         ?? '';

// ── Single-doc sections (GET) ──────────────────────────────────────────────
if ($method === 'GET' && $section) {
    $stmt = $db->prepare('SELECT data_json FROM portfolio_sections WHERE section_name = ?');
    $stmt->execute([$section]);
    $row = $stmt->fetch();
    jsonResponse($row ? (json_decode($row['data_json'], true) ?? []) : null);
}

// ── Single-doc sections (POST/PUT) ────────────────────────────────────────
if (($method === 'POST' || $method === 'PUT') && $section && !$collection) {
    requireAuth();
    $data = getRequestBody();
    $json = json_encode($data);

    $exists = $db->prepare('SELECT section_name FROM portfolio_sections WHERE section_name = ?');
    $exists->execute([$section]);

    if ($exists->fetch()) {
        $db->prepare('UPDATE portfolio_sections SET data_json = ?, updated_at = NOW() WHERE section_name = ?')
           ->execute([$json, $section]);
    } else {
        $db->prepare('INSERT INTO portfolio_sections (section_name, data_json) VALUES (?, ?)')
           ->execute([$section, $json]);
    }

    jsonResponse(['ok' => true]);
}

// ── Collection: GET all items ──────────────────────────────────────────────
if ($method === 'GET' && $collection) {
    $stmt = $db->prepare(
        'SELECT id, order_index, data_json, created_at, updated_at
         FROM portfolio_items WHERE collection_name = ? ORDER BY order_index ASC'
    );
    $stmt->execute([$collection]);
    $rows = $stmt->fetchAll();

    $items = array_map(function ($r) {
        $d = json_decode($r['data_json'], true) ?? [];
        return array_merge($d, [
            'id'         => $r['id'],
            'order'      => (int)$r['order_index'],
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at'],
        ]);
    }, $rows);

    jsonResponse($items);
}

// ── Collection: CREATE ─────────────────────────────────────────────────────
if ($method === 'POST' && $collection) {
    requireAuth();
    $data  = getRequestBody();
    $newId = generateUuid();
    $order = (int)($data['order'] ?? 0);
    unset($data['id']);
    $json  = json_encode($data);
    $now   = date('Y-m-d H:i:s');

    $db->prepare(
        'INSERT INTO portfolio_items (id, collection_name, order_index, data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([$newId, $collection, $order, $json, $now, $now]);

    jsonResponse(['id' => $newId]);
}

// ── Collection: UPDATE ─────────────────────────────────────────────────────
if ($method === 'PUT' && $collection && $id) {
    requireAuth();
    $data  = getRequestBody();
    $order = (int)($data['order'] ?? 0);
    unset($data['id'], $data['created_at'], $data['updated_at']);
    $json  = json_encode($data);

    $db->prepare(
        'UPDATE portfolio_items SET order_index = ?, data_json = ?, updated_at = NOW()
         WHERE id = ? AND collection_name = ?'
    )->execute([$order, $json, $id, $collection]);

    jsonResponse(['ok' => true]);
}

// ── Collection: DELETE ─────────────────────────────────────────────────────
if ($method === 'DELETE' && $collection && $id) {
    requireAuth();
    $db->prepare('DELETE FROM portfolio_items WHERE id = ? AND collection_name = ?')
       ->execute([$id, $collection]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed or missing parameters', 405);
