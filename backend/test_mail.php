<?php
/**
 * test_mail.php - Advanced SMTP Diagnostic Tool
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mail_helper.php';

header('Content-Type: text/plain');

echo "=== SMTP DIAGNOSTIC START ===\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Host: " . ($_SERVER['HTTP_HOST'] ?? 'unknown') . "\n";

if (!defined('MAIL_DRIVER')) {
    echo "ERROR: MAIL_DRIVER not defined. Site might not be installed.\n";
    exit;
}

echo "Configured Driver: " . MAIL_DRIVER . "\n";
echo "Configured Host:   " . (defined('SMTP_HOST') ? SMTP_HOST : 'N/A') . "\n";
echo "Configured Port:   " . (defined('SMTP_PORT') ? SMTP_PORT : 'N/A') . "\n";
echo "Configured User:   " . (defined('SMTP_USER') ? SMTP_USER : 'N/A') . "\n";
echo "Configured Enc:    " . (defined('SMTP_ENC')  ? SMTP_ENC : 'N/A') . "\n";

$to = defined('SMTP_USER') ? SMTP_USER : "mdeepak.be16@gmail.com";
$subject = "Diagnostic Test Mail";
$message = "<h1>Diagnostic Test</h1><p>This is a test mail to verify SMTP settings.</p>";

echo "\n--- Attempting sendMail() ---\n";
$success = sendMail($to, $subject, $message);

if ($success) {
    echo "SUCCESS: Mail sent to $to\n";
} else {
    echo "FAILED: Mail could not be sent.\n";
}

echo "\n--- MAILING LOGS (Last 50 lines) ---\n";
$logFile = __DIR__ . '/mail_log.txt';
if (file_exists($logFile)) {
    $lines = file($logFile);
    $lastLines = array_slice($lines, -50);
    echo implode("", $lastLines);
} else {
    echo "No log file found at $logFile\n";
}

echo "\n=== DIAGNOSTIC END ===\n";
