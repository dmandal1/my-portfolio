<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

// Self-healing Schema: Ensure visitor_analytics table exists
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS visitor_analytics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            page_path VARCHAR(255) NOT NULL,
            referrer VARCHAR(500) DEFAULT '',
            device_type VARCHAR(50) DEFAULT 'desktop',
            browser VARCHAR(100) DEFAULT 'Other',
            country_code VARCHAR(10) DEFAULT 'XX',
            ip_hash VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_ip_hash (ip_hash)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (\Throwable $e) {
    // Silently continue to prevent breaking application
}

// Helper to extract browser name from User-Agent
function getBrowserName(?string $userAgent): string {
    if (empty($userAgent)) return 'Other';
    if (stripos($userAgent, 'OPR') !== false || stripos($userAgent, 'Opera') !== false) return 'Opera';
    if (stripos($userAgent, 'Edg') !== false) return 'Edge';
    if (stripos($userAgent, 'Chrome') !== false) return 'Chrome';
    if (stripos($userAgent, 'Safari') !== false) return 'Safari';
    if (stripos($userAgent, 'Firefox') !== false) return 'Firefox';
    if (stripos($userAgent, 'MSIE') !== false || stripos($userAgent, 'Trident') !== false) return 'Internet Explorer';
    return 'Other';
}

if ($method === 'POST') {
    $data = getRequestBody();
    $path = trim($data['path'] ?? '');
    
    if (empty($path)) {
        errorResponse('Missing path parameter');
    }
    
    $referrer = trim($data['referrer'] ?? '');
    // Clean referrers that are the same site or empty
    if (!empty($referrer)) {
        $refUrl = parse_url($referrer);
        $currUrl = parse_url('https://' . ($_SERVER['HTTP_HOST'] ?? ''));
        if (isset($refUrl['host']) && isset($currUrl['host']) && $refUrl['host'] === $currUrl['host']) {
            $referrer = 'Direct';
        }
    } else {
        $referrer = 'Direct';
    }
    
    $screenWidth = intval($data['screenWidth'] ?? 1024);
    
    // Deduce device type
    if ($screenWidth < 768) {
        $deviceType = 'mobile';
    } elseif ($screenWidth >= 768 && $screenWidth < 1024) {
        $deviceType = 'tablet';
    } else {
        $deviceType = 'desktop';
    }
    
    // Anonymized IP hash (GDPR compliant)
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ipHash = hash('sha256', $ip . date('Y-m-d'));
    
    // Browser
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $browser = getBrowserName($ua);
    
    // Country Code (Cloudflare / generic proxy / XX)
    $countryCode = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? $_SERVER['HTTP_X_COUNTRY_CODE'] ?? 'XX';
    $countryCode = strtoupper(trim($countryCode));
    if (strlen($countryCode) !== 2) {
        $countryCode = 'XX';
    }
    
    try {
        $stmt = $db->prepare("
            INSERT INTO visitor_analytics (page_path, referrer, device_type, browser, country_code, ip_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$path, $referrer, $deviceType, $browser, $countryCode, $ipHash]);
        jsonResponse(['ok' => true]);
    } catch (\Throwable $e) {
        errorResponse('Failed to log page view: ' . $e->getMessage(), 500);
    }
}

if ($method === 'GET') {
    requireAuth(); // Restrict to admin
    
    $range = trim($_GET['range'] ?? 'all');
    
    // Compute date cutoff SQL segment
    $where = "1=1";
    
    if ($range === '7d') {
        $where = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } elseif ($range === '30d') {
        $where = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    }
    
    try {
        // 1. Total Views
        $stmt = $db->query("SELECT COUNT(*) FROM visitor_analytics WHERE $where");
        $totalViews = (int)$stmt->fetchColumn();
        
        // 2. Unique Visitors (distinct ip_hash)
        $stmt = $db->query("SELECT COUNT(DISTINCT ip_hash) FROM visitor_analytics WHERE $where");
        $uniques = (int)$stmt->fetchColumn();
        
        // 3. Trends (Daily Views and Uniques)
        $trendsQuery = "
            SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT ip_hash) as uniques 
            FROM visitor_analytics 
            WHERE $where 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        ";
        $trends = $db->query($trendsQuery)->fetchAll();
        foreach ($trends as &$t) {
            $t['views'] = (int)$t['views'];
            $t['uniques'] = (int)$t['uniques'];
        }
        unset($t);
        
        // 4. Top page paths
        $topPaths = $db->query("
            SELECT page_path, COUNT(*) as views, COUNT(DISTINCT ip_hash) as uniques 
            FROM visitor_analytics 
            WHERE $where 
            GROUP BY page_path 
            ORDER BY views DESC 
            LIMIT 15
        ")->fetchAll();
        foreach ($topPaths as &$tp) {
            $tp['views'] = (int)$tp['views'];
            $tp['uniques'] = (int)$tp['uniques'];
        }
        unset($tp);
        
        // 5. Top referrers
        $referrers = $db->query("
            SELECT referrer, COUNT(*) as views, COUNT(DISTINCT ip_hash) as uniques
            FROM visitor_analytics 
            WHERE $where 
            GROUP BY referrer 
            ORDER BY views DESC 
            LIMIT 15
        ")->fetchAll();
        foreach ($referrers as &$r) {
            $r['views'] = (int)$r['views'];
            $r['uniques'] = (int)$r['uniques'];
        }
        unset($r);
        
        // 6. Device breakdown
        $devices = $db->query("
            SELECT device_type, COUNT(*) as views, COUNT(DISTINCT ip_hash) as uniques
            FROM visitor_analytics 
            WHERE $where 
            GROUP BY device_type 
            ORDER BY views DESC
        ")->fetchAll();
        foreach ($devices as &$d) {
            $d['views'] = (int)$d['views'];
            $d['uniques'] = (int)$d['uniques'];
        }
        unset($d);
        
        // 7. Browser breakdown
        $browsers = $db->query("
            SELECT browser, COUNT(*) as views, COUNT(DISTINCT ip_hash) as uniques
            FROM visitor_analytics 
            WHERE $where 
            GROUP BY browser 
            ORDER BY views DESC 
            LIMIT 15
        ")->fetchAll();
        foreach ($browsers as &$b) {
            $b['views'] = (int)$b['views'];
            $b['uniques'] = (int)$b['uniques'];
        }
        unset($b);
        
        // 8. Country breakdown
        $countries = $db->query("
            SELECT country_code, COUNT(*) as views, COUNT(DISTINCT ip_hash) as uniques
            FROM visitor_analytics 
            WHERE $where 
            GROUP BY country_code 
            ORDER BY views DESC 
            LIMIT 15
        ")->fetchAll();
        foreach ($countries as &$c) {
            $c['views'] = (int)$c['views'];
            $c['uniques'] = (int)$c['uniques'];
        }
        unset($c);
        
        jsonResponse([
            'totalViews' => $totalViews,
            'uniques' => $uniques,
            'trends' => $trends,
            'topPaths' => $topPaths,
            'referrers' => $referrers,
            'devices' => $devices,
            'browsers' => $browsers,
            'countries' => $countries,
        ]);
        
    } catch (\Throwable $e) {
        errorResponse('Failed to fetch analytics: ' . $e->getMessage(), 500);
    }
}

errorResponse('Method not allowed', 405);
