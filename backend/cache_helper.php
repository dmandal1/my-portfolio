<?php
define('CACHE_DIR', __DIR__ . '/cache/');
define('CACHE_TTL', 600); // 10 minutes

function getCache(string $key): ?string {
    $file = CACHE_DIR . md5($key) . '.json';
    if (file_exists($file) && (time() - filemtime($file) < CACHE_TTL)) {
        return file_get_contents($file);
    }
    return null;
}

function setCache(string $key, string $data): void {
    if (!is_dir(CACHE_DIR)) {
        @mkdir(CACHE_DIR, 0755, true);
    }
    @file_put_contents(CACHE_DIR . md5($key) . '.json', $data);
}

function clearCache(): void {
    if (!is_dir(CACHE_DIR)) return;
    $files = glob(CACHE_DIR . '*.json');
    if ($files) {
        foreach ($files as $file) {
            @unlink($file);
        }
    }
}
