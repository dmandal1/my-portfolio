<?php
require_once __DIR__ . '/backend/config.php';
$db = getDb();

function checkTable($db, $table) {
    try {
        $stmt = $db->query("DESCRIBE $table");
        echo "Table: $table\n";
        while ($row = $stmt->fetch()) {
            echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
        }
    } catch (Exception $e) {
        echo "Table: $table - ERROR: " . $e->getMessage() . "\n";
    }
}

checkTable($db, 'comments');
checkTable($db, 'redirects');
