<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

if ($method === 'GET') {
    $withCounts = isset($_GET['counts']);

    $rows = $db->query('SELECT * FROM categories ORDER BY name ASC')->fetchAll();

    if ($withCounts) {
        // Count published blogs per category
        $blogRows = $db->query('SELECT category_id, category_ids FROM blogs')->fetchAll();
        $counts   = [];
        foreach ($blogRows as $b) {
            $ids = [];
            if ($b['category_id']) $ids[] = $b['category_id'];
            if ($b['category_ids']) {
                $extra = json_decode($b['category_ids'], true);
                if (is_array($extra)) $ids = array_merge($ids, $extra);
            }
            foreach (array_unique($ids) as $cid) {
                $counts[$cid] = ($counts[$cid] ?? 0) + 1;
            }
        }
        $rows = array_map(fn($r) => [...$r, 'postCount' => $counts[$r['id']] ?? 0], $rows);
    }

    jsonResponse($rows);
}

if ($method === 'POST') {
    requireAuth();
    $data = getRequestBody();
    $name = trim($data['name'] ?? '');
    $slug = strtolower(trim($data['slug'] ?? ''));

    if (!$name || !$slug) errorResponse('Name and slug are required');

    $id  = generateUuid();
    $now = date('Y-m-d H:i:s');

    $db->prepare(
        'INSERT INTO categories (id, name, slug, parent_id, description, post_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
    )->execute([$id, $name, $slug, $data['parentId'] ?? null, $data['description'] ?? '', $now, $now]);

    jsonResponse(['id' => $id]);
}

if ($method === 'PUT') {
    requireAuth();
    $id   = $_GET['id'] ?? '';
    $data = getRequestBody();
    if (!$id) errorResponse('Missing id');

    $db->prepare(
        'UPDATE categories SET name = ?, slug = ?, parent_id = ?, description = ?, updated_at = NOW() WHERE id = ?'
    )->execute([
        trim($data['name'] ?? ''),
        strtolower(trim($data['slug'] ?? '')),
        $data['parentId'] ?? null,
        $data['description'] ?? '',
        $id,
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    requireAuth();
    $id = $_GET['id'] ?? '';
    if (!$id) errorResponse('Missing id');
    $db->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
