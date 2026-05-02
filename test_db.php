<?php
require_once __DIR__ . '/backend/config.php';
$db = getDb();
$stmt = $db->query("SELECT COUNT(*) FROM newsletter_subscribers");
$count = $stmt->fetchColumn();
echo "Subscribers count: " . $count . "\n";
