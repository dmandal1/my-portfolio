<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

function slugify(string $text): string {
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
    $text = trim($text);
    return preg_replace('/\s+/', '-', $text);
}

if ($method === 'GET') {
    $rows = $db->query('SELECT * FROM tags ORDER BY name ASC')->fetchAll();

    // Count blog usage
    $blogRows = $db->query('SELECT tags, tag_ids FROM blogs')->fetchAll();
    $counts   = [];
    $bySlug   = array_combine(array_column($rows, 'slug'), array_column($rows, 'id'));

    foreach ($blogRows as $b) {
        $matched = [];
        $tagIds  = $b['tag_ids'] ? json_decode($b['tag_ids'], true) : [];
        if (is_array($tagIds)) {
            foreach ($tagIds as $tid) $matched[$tid] = true;
        }
        $rawTags = array_filter(array_map('trim', explode(',', $b['tags'] ?? '')));
        foreach ($rawTags as $t) {
            $s = slugify($t);
            if (isset($bySlug[$s])) $matched[$bySlug[$s]] = true;
        }
        foreach (array_keys($matched) as $tid) {
            $counts[$tid] = ($counts[$tid] ?? 0) + 1;
        }
    }

    $rows = array_map(fn($r) => [...$r, 'postCount' => $counts[$r['id']] ?? 0], $rows);
    jsonResponse($rows);
}

if ($method === 'POST') {
    requireAuth();
    $data = getRequestBody();
    $name = trim($data['name'] ?? '');
    if (!$name) errorResponse('Name is required');

    $id  = generateUuid();
    $now = date('Y-m-d H:i:s');

    $db->prepare(
        'INSERT INTO tags (id, name, slug, post_count, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
    )->execute([$id, $name, slugify($name), $now, $now]);

    jsonResponse(['id' => $id]);
}

if ($method === 'PUT') {
    requireAuth();
    $id   = $_GET['id'] ?? '';
    $data = getRequestBody();
    if (!$id) errorResponse('Missing id');

    $db->prepare('UPDATE tags SET name = ?, slug = ?, updated_at = NOW() WHERE id = ?')
       ->execute([trim($data['name'] ?? ''), strtolower(trim($data['slug'] ?? '')), $id]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    requireAuth();
    $id = $_GET['id'] ?? '';
    if (!$id) errorResponse('Missing id');
    $db->prepare('DELETE FROM tags WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
