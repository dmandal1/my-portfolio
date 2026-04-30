<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

// ── GET: list comments for a blog ──────────────────────────────────────────
if ($method === 'GET') {
    $blogId   = $_GET['blog_id'] ?? '';
    $admin    = isset($_GET['admin']);
    $recent   = isset($_GET['recent']);
    $overview = isset($_GET['overview']);

    // Admin: all comments overview
    if ($overview) {
        requireAuth();
        $rows = $db->query(
            'SELECT c.*, b.title AS blog_title
             FROM comments c
             LEFT JOIN blogs b ON b.id = c.blog_id
             ORDER BY c.created_at DESC'
        )->fetchAll();
        jsonResponse(['total' => count($rows), 'comments' => $rows]);
    }

    // Recent comments across all blogs
    if ($recent) {
        $max  = min(50, (int)($_GET['max'] ?? 10));
        $rows = $db->query(
            'SELECT c.*, b.title AS blog_title
             FROM comments c
             LEFT JOIN blogs b ON b.id = c.blog_id
             ORDER BY c.created_at DESC
             LIMIT ' . $max
        )->fetchAll();
        jsonResponse($rows);
    }

    if (!$blogId) errorResponse('Missing blog_id');

    $stmt = $db->prepare('SELECT * FROM comments WHERE blog_id = ? ORDER BY created_at ASC');
    $stmt->execute([$blogId]);
    jsonResponse($stmt->fetchAll());
}

// ── POST: add a comment ────────────────────────────────────────────────────
if ($method === 'POST') {
    $data        = getRequestBody();
    $blogId      = $data['blogId'] ?? $data['blog_id'] ?? '';
    $name        = trim($data['name'] ?? '');
    $message     = trim($data['message'] ?? '');
    $parentId    = $data['parentId']    ?? null;
    $replyToName = $data['replyToName'] ?? null;
    $isAuthor    = (bool)($data['isAuthorReply'] ?? false);

    if (!$blogId)  errorResponse('Missing blogId');
    if (!$name)    errorResponse('Name is required');
    if (!$message) errorResponse('Message is required');

    // Check blog allows comments (unless author reply)
    if (!$isAuthor) {
        $blogStmt = $db->prepare('SELECT allow_comments FROM blogs WHERE id = ? AND published = 1');
        $blogStmt->execute([$blogId]);
        $blog = $blogStmt->fetch();
        if (!$blog || !$blog['allow_comments']) {
            errorResponse('Comments are disabled for this post.');
        }
    }

    $id  = generateUuid();
    $now = date('Y-m-d H:i:s');

    $stmt = $db->prepare(
        'INSERT INTO comments (id, blog_id, name, message, parent_id, reply_to_name, is_author_reply, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $id,
        $blogId,
        mb_substr($name, 0, 80),
        mb_substr($message, 0, 1000),
        $parentId,
        $replyToName ? mb_substr($replyToName, 0, 80) : null,
        $isAuthor ? 1 : 0,
        $now,
    ]);

    // Update blog comment counter
    $db->prepare(
        'UPDATE blogs SET comments_count = comments_count + 1, last_commented_at = NOW(), updated_at = NOW() WHERE id = ?'
    )->execute([$blogId]);

    jsonResponse(['id' => $id]);
}

// ── DELETE: delete comment (admin) ─────────────────────────────────────────
if ($method === 'DELETE') {
    requireAuth();
    $blogId    = $_GET['blog_id']    ?? '';
    $commentId = $_GET['comment_id'] ?? '';

    if (!$blogId || !$commentId) errorResponse('Missing blog_id or comment_id');

    // Cascade: also delete child comments
    $allStmt = $db->prepare('SELECT id, parent_id FROM comments WHERE blog_id = ?');
    $allStmt->execute([$blogId]);
    $all = $allStmt->fetchAll();

    $toDelete = [$commentId];
    $changed  = true;
    while ($changed) {
        $changed = false;
        foreach ($all as $c) {
            if ($c['parent_id'] && in_array($c['parent_id'], $toDelete) && !in_array($c['id'], $toDelete)) {
                $toDelete[] = $c['id'];
                $changed    = true;
            }
        }
    }

    $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
    $db->prepare("DELETE FROM comments WHERE id IN ($placeholders)")->execute($toDelete);

    // Recount remaining
    $countStmt = $db->prepare('SELECT COUNT(*) as cnt FROM comments WHERE blog_id = ?');
    $countStmt->execute([$blogId]);
    $remaining = (int)$countStmt->fetch()['cnt'];

    $db->prepare('UPDATE blogs SET comments_count = ?, updated_at = NOW() WHERE id = ?')
       ->execute([$remaining, $blogId]);

    jsonResponse(['ok' => true]);
}

errorResponse('Method not allowed', 405);
