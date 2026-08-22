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
    $lang = trim($_GET['lang'] ?? '');

    // Fetch all sections
    $sectionsStmt = $db->query('SELECT section_name, data_json FROM portfolio_sections');
    $sectionsRows = $sectionsStmt->fetchAll();

    // Fetch all collection items
    $itemsStmt = $db->query(
        'SELECT id, collection_name, order_index, data_json, created_at, updated_at
         FROM portfolio_items ORDER BY collection_name ASC, order_index ASC'
    );
    $itemsRows = $itemsStmt->fetchAll();

    $rawSections = [];
    foreach ($sectionsRows as $row) {
        $rawSections[$row['section_name']] = json_decode($row['data_json'] ?? '', true) ?? [];
    }

    $rawCollections = [];
    foreach ($itemsRows as $row) {
        $coll = $row['collection_name'];
        if (!isset($rawCollections[$coll])) {
            $rawCollections[$coll] = [];
        }
        $d = json_decode($row['data_json'] ?? '', true) ?? [];
        $rawCollections[$coll][] = array_merge($d, [
            'id'         => $row['id'],
            'order'      => (int)$row['order_index'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ]);
    }

    $sections = [];
    $collections = [];

    // Base portfolio sections
    $baseSections = [
        'portfolioProfile', 'portfolioContact', 'portfolioSeo',
        'portfolioExperienceHeader', 'portfolioContactPageData',
        'portfolioProjectsHeader', 'portfolioOpenSource',
        'portfolioPodcast', 'portfolioBlogSection', 'portfolioMenuLinks'
    ];

    foreach ($baseSections as $base) {
        $target = ($lang !== '' && $lang !== 'en') ? $base . '_' . $lang : $base;
        if (($lang !== '' && $lang !== 'en') && isset($rawSections[$target])) {
            $sections[$base] = $rawSections[$target];
        } else {
            $sections[$base] = $rawSections[$base] ?? [];
        }
    }

    // Base portfolio collections
    $baseCollections = [
        'portfolioSocialLinks', 'portfolioEducation', 'portfolioCompetitiveSites',
        'portfolioProjects', 'portfolioSkills', 'portfolioCertifications', 'portfolioExperiences'
    ];

    foreach ($baseCollections as $base) {
        $target = ($lang !== '' && $lang !== 'en') ? $base . '_' . $lang : $base;
        if (($lang !== '' && $lang !== 'en') && isset($rawCollections[$target]) && count($rawCollections[$target]) > 0) {
            $collections[$base] = $rawCollections[$target];
        } else {
            $collections[$base] = $rawCollections[$base] ?? [];
        }
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
    $lang = trim($_GET['lang'] ?? '');
    $sectionTarget = ($lang !== '' && $lang !== 'en') ? $section . '_' . $lang : $section;

    $stmt = $db->prepare('SELECT data_json FROM portfolio_sections WHERE section_name = ?');
    $stmt->execute([$sectionTarget]);
    $row = $stmt->fetch();

    if (!$row && $sectionTarget !== $section) {
        $stmt->execute([$section]);
        $row = $stmt->fetch();
    }

    $resData = $row ? (json_decode($row['data_json'] ?? '', true) ?? []) : [];
    setCache($cacheKey, json_encode($resData));
    jsonResponse($resData);
}

// ── Single-doc sections (POST/PUT) ────────────────────────────────────────
if (($method === 'POST' || $method === 'PUT') && $section && !$collection) {
    requireAuth();
    $lang = trim($_GET['lang'] ?? '');
    $sectionTarget = ($lang !== '' && $lang !== 'en') ? $section . '_' . $lang : $section;

    $data = getRequestBody();
    $json = json_encode($data);

    $exists = $db->prepare('SELECT section_name FROM portfolio_sections WHERE section_name = ?');
    $exists->execute([$sectionTarget]);

    if ($exists->fetch()) {
        $db->prepare('UPDATE portfolio_sections SET data_json = ?, updated_at = NOW() WHERE section_name = ?')
           ->execute([$json, $sectionTarget]);
    } else {
        $db->prepare('INSERT INTO portfolio_sections (section_name, data_json) VALUES (?, ?)')
           ->execute([$sectionTarget, $json]);
    }

    jsonResponse(['ok' => true]);
}

// ── Collection: GET all items ──────────────────────────────────────────────
if ($method === 'GET' && $collection) {
    $lang = trim($_GET['lang'] ?? '');
    $collectionTarget = ($lang !== '' && $lang !== 'en') ? $collection . '_' . $lang : $collection;

    $stmt = $db->prepare(
        'SELECT id, order_index, data_json, created_at, updated_at
         FROM portfolio_items WHERE collection_name = ? ORDER BY order_index ASC'
    );
    $stmt->execute([$collectionTarget]);
    $rows = $stmt->fetchAll();

    if (empty($rows) && $collectionTarget !== $collection) {
        $stmt->execute([$collection]);
        $rows = $stmt->fetchAll();
    }

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
    $lang = trim($_GET['lang'] ?? '');
    $collectionTarget = ($lang !== '' && $lang !== 'en') ? $collection . '_' . $lang : $collection;

    $data  = getRequestBody();
    $newId = generateUuid();
    $order = (int)($data['order'] ?? 0);
    unset($data['id']);
    $json  = json_encode($data);
    $now   = date('Y-m-d H:i:s');

    $db->prepare(
        'INSERT INTO portfolio_items (id, collection_name, order_index, data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([$newId, $collectionTarget, $order, $json, $now, $now]);

    jsonResponse(['id' => $newId]);
}

// ── Collection: UPDATE ─────────────────────────────────────────────────────
if ($method === 'PUT' && $collection && $id) {
    requireAuth();
    $lang = trim($_GET['lang'] ?? '');
    $collectionTarget = ($lang !== '' && $lang !== 'en') ? $collection . '_' . $lang : $collection;

    $data  = getRequestBody();
    $order = (int)($data['order'] ?? 0);
    unset($data['id'], $data['created_at'], $data['updated_at']);
    $json  = json_encode($data);

    $db->prepare(
        'UPDATE portfolio_items SET order_index = ?, data_json = ?, updated_at = NOW()
         WHERE id = ? AND collection_name = ?'
    )->execute([$order, $json, $id, $collectionTarget]);

    jsonResponse(['ok' => true]);
}

// ── Collection: DELETE ─────────────────────────────────────────────────────
if ($method === 'DELETE' && $collection && $id) {
    requireAuth();
    $lang = trim($_GET['lang'] ?? '');
    $collectionTarget = ($lang !== '' && $lang !== 'en') ? $collection . '_' . $lang : $collection;

    $db->prepare('DELETE FROM portfolio_items WHERE id = ? AND collection_name = ?')
       ->execute([$id, $collectionTarget]);
    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed or missing parameters', 405);
