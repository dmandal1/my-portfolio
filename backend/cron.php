<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

$db = getDb();

try {
    // Publish scheduled posts
    $stmt = $db->prepare(
        'UPDATE blogs SET published = 1, pending_review = 0, scheduled_at = NULL, updated_at = NOW()
         WHERE published = 0 AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()'
    );
    $stmt->execute();
    $count = $stmt->rowCount();
    
    // Clear public cache since blogs have changed
    if ($count > 0) {
        require_once __DIR__ . '/cache_helper.php';
        clearCache();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => true, 'published_count' => $count]);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $e->getMessage()]);
}
