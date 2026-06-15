<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

require_once __DIR__ . '/cache_helper.php';

// Invalidate cache on write operations
if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
    clearCache();
}

// Serve from cache if available (GET requests only)
$cacheKey = '';
if ($method === 'GET') {
    $cacheKey = 'portfolio_' . trim($_SERVER['REQUEST_URI'], '/');
    $cached = getCache($cacheKey);
    if ($cached !== null) {
        echo $cached;
        exit;
    }
}

$section    = $_GET['section']    ?? '';
$collection = $_GET['collection'] ?? '';
$id         = $_GET['id']         ?? '';

// ── Batch GET: all sections and collections ─────────────────────────────────
if ($method === 'GET' && isset($_GET['all'])) {
    // Fetch all sections
    $sectionsStmt = $db->query('SELECT section_name, data_json FROM portfolio_sections');
    $sectionsRows = $sectionsStmt->fetchAll();
    $sections = [];
    foreach ($sectionsRows as $row) {
        $sections[$row['section_name']] = json_decode($row['data_json'] ?? '', true) ?? [];
    }

    // Fetch all collection items
    $itemsStmt = $db->query(
        'SELECT id, collection_name, order_index, data_json, created_at, updated_at
         FROM portfolio_items ORDER BY collection_name ASC, order_index ASC'
    );
    $itemsRows = $itemsStmt->fetchAll();
    
    $collections = [];
    foreach ($itemsRows as $row) {
        $coll = $row['collection_name'];
        if (!isset($collections[$coll])) {
            $collections[$coll] = [];
        }
        $d = json_decode($row['data_json'] ?? '', true) ?? [];
        $collections[$coll][] = array_merge($d, [
            'id'         => $row['id'],
            'order'      => (int)$row['order_index'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ]);
    }

    $resData = [
        'sections'    => $sections,
        'collections' => $collections,
    ];
    setCache($cacheKey, json_encode($resData));
    jsonResponse($resData);
}

// ── Single-doc sections (GET) ──────────────────────────────────────────────
if ($method === 'GET' && $section) {
    $stmt = $db->prepare('SELECT data_json FROM portfolio_sections WHERE section_name = ?');
    $stmt->execute([$section]);
    $row = $stmt->fetch();
    $resData = $row ? (json_decode($row['data_json'] ?? '', true) ?? []) : [];
    setCache($cacheKey, json_encode($resData));
    jsonResponse($resData);
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

    setCache($cacheKey, json_encode($items));
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
