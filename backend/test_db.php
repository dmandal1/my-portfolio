<?php
require_once __DIR__ . '/config.php';
try {
    $db = getDb();
    echo "Connected successfully to " . DB_NAME;
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage();
}
