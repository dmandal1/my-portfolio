<?php
/**
 * check_log.php - Simple utility to view mailing logs
 */
header('Content-Type: text/plain');
$logFile = __DIR__ . '/mail_log.txt';

if (file_exists($logFile)) {
    echo "--- MAILING LOGS (Last 50 lines) ---\n\n";
    $lines = file($logFile);
    $lastLines = array_slice($lines, -50);
    echo implode("", $lastLines);
} else {
    echo "No log file found at $logFile. Try sending an email first.";
}
