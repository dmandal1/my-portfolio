<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$db = getDb();

// Create table if not exists
$db->exec("
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    status        VARCHAR(50) DEFAULT 'active',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Admin Broadcast endpoint
    if (isset($_GET['action']) && $_GET['action'] === 'broadcast') {
        requireAuth();
        $body = getRequestBody();
        $subject = trim($body['subject'] ?? '');
        $message = trim($body['message'] ?? '');

        if (!$subject || !$message) {
            errorResponse('Subject and message are required.');
        }

        $stmt = $db->prepare("SELECT email FROM newsletter_subscribers WHERE status = 'active'");
        $stmt->execute();
        $emails = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $sentCount = 0;
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: Newsletter <no-reply@' . $_SERVER['HTTP_HOST'] . '>' . "\r\n";

        foreach ($emails as $email) {
            if (mail($email, $subject, $message, $headers)) {
                $sentCount++;
            }
        }

        jsonResponse(['success' => true, 'sent_count' => $sentCount]);
    }

    // Public endpoint to subscribe
    $body = getRequestBody();
    $email = trim($body['email'] ?? '');

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('A valid email is required.');
    }

    try {
        $stmt = $db->prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)');
        $stmt->execute([$email]);
        jsonResponse(['success' => true]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Integrity constraint violation: 1062 Duplicate entry
            // Pretend success so we don't leak subscriber status, or return a specific error
            errorResponse('This email is already subscribed.', 400);
        } else {
            errorResponse('Database error: ' . $e->getMessage(), 500);
        }
    }
}

// Below endpoints require Auth
$payload = requireAuth();

if ($method === 'GET') {
    // Admin endpoint to list all subscribers
    $stmt = $db->prepare('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC');
    $stmt->execute();
    $subscribers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    jsonResponse($subscribers);
}

if ($method === 'DELETE') {
    // Admin endpoint to delete a subscriber
    $id = $_GET['id'] ?? '';
    if (!$id) {
        errorResponse('Subscriber ID required');
    }
    $stmt = $db->prepare('DELETE FROM newsletter_subscribers WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

errorResponse('Method not allowed', 405);
