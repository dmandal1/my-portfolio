<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$db = getDb();

// Create table if not exists
$db->exec("
CREATE TABLE IF NOT EXISTS contact_messages (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    message       TEXT NOT NULL,
    is_read       TINYINT(1) DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Public endpoint to submit a message
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $message = trim($body['message'] ?? '');

    if (!$name || !$email || !$message) {
        errorResponse('Name, email, and message are required.');
    }

    $stmt = $db->prepare('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $message]);

    jsonResponse(['success' => true]);
}

// Below endpoints require Auth
$payload = requireAuth();

if ($method === 'GET') {
    // Admin endpoint to list all messages
    $stmt = $db->prepare('SELECT * FROM contact_messages ORDER BY created_at DESC');
    $stmt->execute();
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($messages);
}

if ($method === 'DELETE') {
    // Admin endpoint to delete a message
    $id = $_GET['id'] ?? '';
    if (!$id) {
        errorResponse('Message ID required');
    }
    $stmt = $db->prepare('DELETE FROM contact_messages WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

// Optionally, PUT to mark as read
if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        errorResponse('Message ID required');
    }
    $stmt = $db->prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

errorResponse('Method not allowed', 405);
