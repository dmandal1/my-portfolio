<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

// ── Helper: convert DB row to blog shape ──────────────────────────────────
function rowToBlog(array $row): array {
    $row['published']      = (bool)$row['published'];
    $row['featured']       = (bool)$row['featured'];
    $row['allow_comments'] = (bool)$row['allow_comments'];
    $row['pending_review'] = (bool)$row['pending_review'];
    $row['views']          = (int)$row['views'];
    $row['comments_count'] = (int)$row['comments_count'];
    $row['category_ids']   = $row['category_ids'] ? json_decode($row['category_ids'], true) : [];
    $row['tag_ids']        = $row['tag_ids']       ? json_decode($row['tag_ids'], true)       : [];
    return $row;
}

function slugify(string $text): string {
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
    $text = trim($text);
    return preg_replace('/\s+/', '-', $text);
}

// ── GET ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $id     = $_GET['id']     ?? '';
    $slug   = $_GET['slug']   ?? '';
    $admin  = isset($_GET['admin']);

    // Admin: get all blogs
    if ($admin) {
        requireAuth();
        $rows = $db->query('SELECT * FROM blogs ORDER BY created_at DESC')->fetchAll();
        jsonResponse(array_map('rowToBlog', $rows));
    }

    // Get by ID
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM blogs WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) errorResponse('Blog not found', 404);
        jsonResponse(rowToBlog($row));
    }

    // Get by slug
    if ($slug) {
        $normalized = slugify($slug);
        if (str_starts_with($normalized, 'id-')) {
            $stmt = $db->prepare('SELECT * FROM blogs WHERE id = ? AND published = 1');
            $stmt->execute([substr($normalized, 3)]);
        } else {
            $stmt = $db->prepare('SELECT * FROM blogs WHERE slug = ? AND published = 1');
            $stmt->execute([$normalized]);
        }
        $row = $stmt->fetch();
        if (!$row) errorResponse('Blog not found', 404);
        jsonResponse(rowToBlog($row));
    }

    // Get all published blogs
    $rows = $db->query('SELECT * FROM blogs WHERE published = 1 ORDER BY created_at DESC')->fetchAll();
    jsonResponse(array_map('rowToBlog', $rows));
}

// ── POST ───────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $action = $_GET['action'] ?? '';

    // Increment view count (no auth required)
    if ($action === 'increment_view') {
        $id = $_GET['id'] ?? '';
        if (!$id) errorResponse('Missing id');
        $db->prepare('UPDATE blogs SET views = views + 1 WHERE id = ?')->execute([$id]);
        jsonResponse(['ok' => true]);
    }

    // Publish scheduled posts (admin)
    if ($action === 'publish_scheduled') {
        requireAuth();
        $stmt = $db->prepare(
            'UPDATE blogs SET published = 1, pending_review = 0, scheduled_at = NULL, updated_at = NOW()
             WHERE published = 0 AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()'
        );
        $stmt->execute();
        jsonResponse(['published' => $stmt->rowCount()]);
    }

    // Approve pending
    if ($action === 'approve') {
        requireAuth();
        $id = $_GET['id'] ?? '';
        if (!$id) errorResponse('Missing id');
        $db->prepare(
            'UPDATE blogs SET published = 1, pending_review = 0, scheduled_at = NULL, updated_at = NOW() WHERE id = ?'
        )->execute([$id]);
        jsonResponse(['ok' => true]);
    }

    // Reject pending
    if ($action === 'reject') {
        requireAuth();
        $id = $_GET['id'] ?? '';
        if (!$id) errorResponse('Missing id');
        $db->prepare(
            'UPDATE blogs SET published = 0, pending_review = 0, scheduled_at = NULL, updated_at = NOW() WHERE id = ?'
        )->execute([$id]);
        jsonResponse(['ok' => true]);
    }

    // Create blog (admin)
    requireAuth();
    $data = getRequestBody();

    $slug = slugify($data['slug'] ?? '') ?: slugify($data['title'] ?? 'post');
    // Ensure slug uniqueness
    $baseSlug = $slug;
    $i = 1;
    while (true) {
        $check = $db->prepare('SELECT id FROM blogs WHERE slug = ?');
        $check->execute([$slug]);
        if (!$check->fetch()) break;
        $slug = $baseSlug . '-' . $i++;
    }

    $id   = generateUuid();
    $now  = date('Y-m-d H:i:s');
    $stmt = $db->prepare(
        'INSERT INTO blogs (id, title, subtitle, slug, content, excerpt, cover_image, image_alt,
         published, featured, allow_comments, pending_review, category_id, category_ids, tags, tag_ids,
         meta_title, meta_description, canonical_url, difficulty, audience, prerequisites,
         repo_url, demo_url, series, views, comments_count, scheduled_at, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?,?)'
    );
    $stmt->execute([
        $id,
        $data['title']          ?? '',
        $data['subtitle']       ?? '',
        $slug,
        $data['content']        ?? '',
        $data['excerpt']        ?? '',
        $data['coverImage']     ?? $data['cover_image'] ?? '',
        $data['imageAlt']       ?? $data['image_alt']   ?? '',
        isset($data['published'])      ? (int)(bool)$data['published']      : 0,
        isset($data['featured'])       ? (int)(bool)$data['featured']       : 0,
        isset($data['allowComments'])  ? (int)(bool)$data['allowComments']  : 1,
        isset($data['pendingReview'])  ? (int)(bool)$data['pendingReview']  : 0,
        $data['categoryId']     ?? null,
        isset($data['categoryIds'])    ? json_encode($data['categoryIds'])  : null,
        is_array($data['tags'] ?? null) ? implode(', ', $data['tags']) : ($data['tags'] ?? ''),
        isset($data['tagIds'])         ? json_encode($data['tagIds'])       : null,
        $data['metaTitle']      ?? $data['meta_title']        ?? '',
        $data['metaDescription']?? $data['meta_description']  ?? '',
        $data['canonicalUrl']   ?? $data['canonical_url']     ?? '',
        $data['difficulty']     ?? 'intermediate',
        $data['audience']       ?? '',
        $data['prerequisites']  ?? '',
        $data['repoUrl']        ?? $data['repo_url']  ?? '',
        $data['demoUrl']        ?? $data['demo_url']  ?? '',
        $data['series']         ?? '',
        $data['scheduledAt']    ?? $data['scheduled_at'] ?? null,
        $now,
        $now,
    ]);

    jsonResponse(['id' => $id]);
}

// ── PUT ────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    requireAuth();
    $id = $_GET['id'] ?? '';
    if (!$id) errorResponse('Missing id');

    $data = getRequestBody();

    // Rebuild slug if title or slug changed
    $sets  = [];
    $vals  = [];

    $fields = [
        'title'            => $data['title']          ?? null,
        'subtitle'         => $data['subtitle']       ?? null,
        'content'          => $data['content']        ?? null,
        'excerpt'          => $data['excerpt']        ?? null,
        'cover_image'      => $data['coverImage']     ?? $data['cover_image']     ?? null,
        'image_alt'        => $data['imageAlt']       ?? $data['image_alt']       ?? null,
        'meta_title'       => $data['metaTitle']      ?? $data['meta_title']      ?? null,
        'meta_description' => $data['metaDescription']?? $data['meta_description']?? null,
        'canonical_url'    => $data['canonicalUrl']   ?? $data['canonical_url']   ?? null,
        'difficulty'       => $data['difficulty']     ?? null,
        'audience'         => $data['audience']       ?? null,
        'prerequisites'    => $data['prerequisites']  ?? null,
        'repo_url'         => $data['repoUrl']        ?? $data['repo_url']        ?? null,
        'demo_url'         => $data['demoUrl']        ?? $data['demo_url']        ?? null,
        'series'           => $data['series']         ?? null,
        'category_id'      => $data['categoryId']     ?? $data['category_id']     ?? null,
        'scheduled_at'     => $data['scheduledAt']    ?? $data['scheduled_at']    ?? null,
    ];

    foreach ($fields as $col => $val) {
        if ($val !== null) {
            $sets[] = "$col = ?";
            $vals[] = $val;
        }
    }

    // Boolean fields — check camelCase key first, then snake_case fallback; never add the same column twice
    foreach (['published' => 'published', 'featured' => 'featured',
              'allowComments' => 'allow_comments', 'pendingReview' => 'pending_review'] as $key => $col) {
        if (array_key_exists($key, $data)) {
            $sets[] = "$col = ?";
            $vals[] = (int)(bool)$data[$key];
        } elseif ($key !== $col && array_key_exists($col, $data)) {
            $sets[] = "$col = ?";
            $vals[] = (int)(bool)$data[$col];
        }
    }

    // Tags
    if (array_key_exists('tags', $data)) {
        $sets[] = 'tags = ?';
        $vals[] = is_array($data['tags']) ? implode(', ', $data['tags']) : ($data['tags'] ?? '');
    }
    if (array_key_exists('tagIds', $data)) {
        $sets[] = 'tag_ids = ?';
        $vals[] = json_encode($data['tagIds']);
    }
    if (array_key_exists('categoryIds', $data)) {
        $sets[] = 'category_ids = ?';
        $vals[] = json_encode($data['categoryIds']);
    }

    // Slug
    $newSlug = null;
    if (!empty($data['slug'])) {
        $newSlug = slugify($data['slug']);
    } elseif (!empty($data['title'])) {
        $newSlug = slugify($data['title']);
    }
    if ($newSlug) {
        $sets[] = 'slug = ?';
        $vals[] = $newSlug;
    }

    if (empty($sets)) errorResponse('No fields to update');

    $sets[] = 'updated_at = NOW()';
    $vals[] = $id;

    $db->prepare('UPDATE blogs SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
    jsonResponse(['ok' => true]);
}

// ── DELETE ─────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    requireAuth();
    $id = $_GET['id'] ?? '';
    if (!$id) errorResponse('Missing id');
    $db->prepare('DELETE FROM blogs WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
