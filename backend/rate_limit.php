<?php
require_once __DIR__ . '/config.php';

function checkRateLimit(string $key, int $maxAttempts = 5, int $decaySeconds = 60): void {
    $db = getDb();
    $now = time();
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    
    // Ensure rate_limits table exists (Self-healing)
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS rate_limits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                `key` VARCHAR(255) NOT NULL,
                ip_address VARCHAR(64) NOT NULL,
                attempts INT DEFAULT 1,
                expires_at INT NOT NULL,
                UNIQUE KEY idx_key_ip (`key`, ip_address)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } catch (\Throwable $e) {
        // Silently fail if table creation fails, but do not block execution
    }
    
    // Clean up expired entries (garbage collection)
    try {
        $db->prepare("DELETE FROM rate_limits WHERE expires_at < ?")->execute([$now]);
    } catch (\Throwable $e) {
        // Silently fail
    }
    
    // Fetch attempts
    try {
        $stmt = $db->prepare("SELECT attempts, expires_at FROM rate_limits WHERE `key` = ? AND ip_address = ? LIMIT 1");
        $stmt->execute([$key, $ip]);
        $row = $stmt->fetch();
        
        if ($row) {
            if ($row['attempts'] >= $maxAttempts) {
                $retryAfter = max(0, $row['expires_at'] - $now);
                errorResponse("Too many attempts. Please try again in $retryAfter seconds.", 429);
            }
            
            $db->prepare("UPDATE rate_limits SET attempts = attempts + 1 WHERE `key` = ? AND ip_address = ?")
               ->execute([$key, $ip]);
        } else {
            $expires = $now + $decaySeconds;
            $db->prepare("INSERT INTO rate_limits (`key`, ip_address, attempts, expires_at) VALUES (?, ?, 1, ?)
                          ON DUPLICATE KEY UPDATE attempts = attempts + 1")
               ->execute([$key, $ip, $expires]);
        }
    } catch (\Throwable $e) {
        // Database queries might fail if table is not fully created or connection fails. 
        // We do not block user login if rate limiting table fails.
    }
}

function resetRateLimit(string $key): void {
    try {
        $db = getDb();
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $db->prepare("DELETE FROM rate_limits WHERE `key` = ? AND ip_address = ?")->execute([$key, $ip]);
    } catch (\Throwable $e) {
        // Silently fail
    }
}
