<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/mail_helper.php';

$db = getDb();

// 1. Create contact_messages
$db->exec("
CREATE TABLE IF NOT EXISTS contact_messages (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    message       TEXT NOT NULL,
    is_read       TINYINT(1) DEFAULT 0,
    is_deleted    TINYINT(1) DEFAULT 0,
    is_starred    TINYINT(1) DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Ensure columns exist
try { $db->exec("ALTER TABLE contact_messages ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER is_read"); } catch (PDOException $e) { }
try { $db->exec("ALTER TABLE contact_messages ADD COLUMN is_starred TINYINT(1) DEFAULT 0 AFTER is_deleted"); } catch (PDOException $e) { }

// 3. Create sent_replies
$db->exec("
CREATE TABLE IF NOT EXISTS sent_replies (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    message_id    INT NOT NULL,
    recipient     VARCHAR(255) NOT NULL,
    subject       VARCHAR(255) NOT NULL,
    message       TEXT NOT NULL,
    attachments   TEXT DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES contact_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// 4. Create reply_drafts
$db->exec("
CREATE TABLE IF NOT EXISTS reply_drafts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    message_id    VARCHAR(80) DEFAULT NULL,
    recipient     VARCHAR(255) DEFAULT '',
    subject       VARCHAR(255) NOT NULL,
    message       TEXT NOT NULL,
    attachments   TEXT DEFAULT NULL,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Migrations for reply_drafts
try { $db->exec("ALTER TABLE reply_drafts ADD COLUMN recipient VARCHAR(255) DEFAULT '' AFTER message_id"); } catch (PDOException $e) { }
try { $db->exec("ALTER TABLE reply_drafts MODIFY message_id VARCHAR(80) DEFAULT NULL"); } catch (PDOException $e) { }

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Public endpoint for message submission
if ($method === 'POST' && !$action) {
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $message = trim($body['message'] ?? '');

    if (!$name || !$email || !$message) errorResponse('Name, email, and message are required.');

    $stmt = $db->prepare('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $message]);
    jsonResponse(['success' => true]);
}

// Protected Endpoints
$payload = requireAuth();

if ($method === 'GET') {
    $folder = $_GET['folder'] ?? 'inbox';
    
    if ($folder === 'sent') {
        $stmt = $db->prepare('SELECT sr.*, cm.name as original_name FROM sent_replies sr LEFT JOIN contact_messages cm ON sr.message_id = cm.id ORDER BY sr.created_at DESC');
    } elseif ($folder === 'trash') {
        $stmt = $db->prepare('SELECT * FROM contact_messages WHERE is_deleted = 1 ORDER BY created_at DESC');
    } elseif ($folder === 'drafts') {
        $stmt = $db->prepare('SELECT rd.*, cm.name, cm.email, cm.message as original_message FROM reply_drafts rd LEFT JOIN contact_messages cm ON rd.message_id = cm.id ORDER BY rd.updated_at DESC');
    } else {
        $stmt = $db->prepare('SELECT * FROM contact_messages WHERE is_deleted = 0 ORDER BY created_at DESC');
    }
    
    $stmt->execute();
    jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($method === 'POST') {
    if ($action === 'reply' || $action === 'sendNew') {
        $messageId = $_POST['messageId'] ?? null;
        $recipient = trim($_POST['recipient'] ?? '');
        $subject   = trim($_POST['subject'] ?? 'No Subject');
        $content   = trim($_POST['message'] ?? '');

        if (!$recipient || !$content) errorResponse('Recipient and message content are required.');

        // Handle Attachments
        $attachmentPaths = [];
        if (!empty($_FILES['attachments'])) {
            $uploadDir = __DIR__ . '/uploads/attachments/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            foreach ($_FILES['attachments']['tmp_name'] as $key => $tmpName) {
                if ($_FILES['attachments']['error'][$key] === UPLOAD_ERR_OK) {
                    $name = basename($_FILES['attachments']['name'][$key]);
                    $safeName = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", $name);
                    $dest = $uploadDir . $safeName;
                    if (move_uploaded_file($tmpName, $dest)) {
                        $attachmentPaths[] = ['name' => $name, 'path' => $dest, 'url' => 'uploads/attachments/' . $safeName];
                    }
                }
            }
        }

        // Extract CC and BCC
        $cc  = !empty($_POST['cc']) ? explode(',', $_POST['cc']) : [];
        $bcc = !empty($_POST['bcc']) ? explode(',', $_POST['bcc']) : [];

        // Send Email
        $sent = sendMail($recipient, $subject, $content, array_column($attachmentPaths, 'path'), $cc, $bcc);
        if (!$sent) errorResponse('Failed to send email. Check SMTP settings.');

        // Save to Sent
        $attachmentsJson = !empty($attachmentPaths) ? json_encode($attachmentPaths) : null;
        // Use 0 or NULL for message_id if it's a new email
        $stmt = $db->prepare('INSERT INTO sent_replies (message_id, recipient, subject, message, attachments) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$messageId ?: 0, $recipient, $subject, $content, $attachmentsJson]);

        // Clean up draft if exists
        if ($messageId) {
            $db->prepare("DELETE FROM reply_drafts WHERE message_id = ?")->execute([$messageId]);
            $db->prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?')->execute([$messageId]);
        }

        jsonResponse(['success' => true]);
    }

    if ($action === 'toggleStar') {
        $body = getRequestBody();
        $id = $body['id'] ?? null;
        if (!$id) errorResponse('ID required');
        $stmt = $db->prepare("UPDATE contact_messages SET is_starred = NOT is_starred WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }

    if ($action === 'saveDraft') {
        $body = getRequestBody();
        $messageId = $body['messageId'] ?? null;
        $recipient = $body['recipient'] ?? '';
        $subject   = $body['subject'] ?? '';
        $message   = $body['message'] ?? '';
        if (!$messageId) errorResponse('Message ID required');
        
        $stmt = $db->prepare("SELECT id FROM reply_drafts WHERE message_id = ?");
        $stmt->execute([$messageId]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            $stmt = $db->prepare("UPDATE reply_drafts SET recipient = ?, subject = ?, message = ? WHERE message_id = ?");
            $stmt->execute([$recipient, $subject, $message, $messageId]);
        } else {
            // Ensure recipient column exists or handle it gracefully
            try {
                $stmt = $db->prepare("INSERT INTO reply_drafts (message_id, recipient, subject, message) VALUES (?, ?, ?, ?)");
                $stmt->execute([$messageId, $recipient, $subject, $message]);
            } catch (Exception $e) {
                // Fallback for old schema if recipient column is missing
                $stmt = $db->prepare("INSERT INTO reply_drafts (message_id, subject, message) VALUES (?, ?, ?)");
                $stmt->execute([$messageId, $subject, $message]);
            }
        }
        jsonResponse(['success' => true]);
    }
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    $ids = $_GET['ids'] ?? '';
    $restore = isset($_GET['restore']) && $_GET['restore'] == '1';
    $unread  = isset($_GET['unread'])  && $_GET['unread']  == '1';

    if ($ids) {
        $idList = explode(',', $ids);
        $placeholders = implode(',', array_fill(0, count($idList), '?'));
        $field = $restore ? 'is_deleted = 0' : 'is_read = 1';
        $stmt = $db->prepare("UPDATE contact_messages SET $field WHERE id IN ($placeholders)");
        $stmt->execute($idList);
        jsonResponse(['success' => true]);
    } elseif ($id) {
        if ($restore)      $field = 'is_deleted = 0';
        elseif ($unread)   $field = 'is_read = 0';
        else               $field = 'is_read = 1';
        $stmt = $db->prepare("UPDATE contact_messages SET $field WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    $ids = $_GET['ids'] ?? '';
    $permanent = isset($_GET['permanent']) && $_GET['permanent'] == '1';
    $action = $_GET['action'] ?? '';

    if ($action === 'deleteDraft') {
        if (!$id) errorResponse('Draft ID required');
        $db->prepare("DELETE FROM reply_drafts WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
    }

    if ($ids) {
        $idList = explode(',', $ids);
        $placeholders = implode(',', array_fill(0, count($idList), '?'));
        if ($permanent) {
            $stmt = $db->prepare("DELETE FROM contact_messages WHERE id IN ($placeholders)");
        } else {
            $stmt = $db->prepare("UPDATE contact_messages SET is_deleted = 1 WHERE id IN ($placeholders)");
        }
        $stmt->execute($idList);
        jsonResponse(['success' => true]);
    } elseif ($id) {
        if ($permanent) {
            $stmt = $db->prepare("DELETE FROM contact_messages WHERE id = ?");
        } else {
            $stmt = $db->prepare("UPDATE contact_messages SET is_deleted = 1 WHERE id = ?");
        }
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

errorResponse('Not found or method not allowed', 404);
