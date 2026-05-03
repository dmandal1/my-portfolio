<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

// This is a public endpoint, no requireAuth() needed for reading RSS
$db = getDb();

// Fetch latest published posts
$stmt = $db->query("
    SELECT id, title, slug, subtitle, excerpt, content, created_at, cover_image 
    FROM blogs 
    WHERE published = 1 
    ORDER BY created_at DESC 
    LIMIT 20
");
$posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Fetch site metadata
$profileStmt = $db->query("SELECT content FROM portfolio_data WHERE section_name = 'portfolioProfile' LIMIT 1");
$profileData = $profileStmt->fetchColumn();
$profile = json_decode($profileData ?: '{}', true);

$siteTitle = $profile['logo_name'] ?? $profile['title'] ?? 'My Professional Portfolio';
$siteDesc  = $profile['role'] ?? 'Latest insights and articles';
$siteUrl   = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]";

header('Content-Type: application/rss+xml; charset=utf-8');

echo '<?xml version="1.0" encoding="UTF-8" ?>' . PHP_EOL;
echo '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">' . PHP_EOL;
echo '<channel>' . PHP_EOL;
echo '  <title>' . htmlspecialchars($siteTitle) . '</title>' . PHP_EOL;
echo '  <link>' . htmlspecialchars($siteUrl) . '</link>' . PHP_EOL;
echo '  <description>' . htmlspecialchars($siteDesc) . '</description>' . PHP_EOL;
echo '  <language>en-us</language>' . PHP_EOL;
echo '  <pubDate>' . date(DATE_RSS) . '</pubDate>' . PHP_EOL;
echo '  <lastBuildDate>' . date(DATE_RSS) . '</lastBuildDate>' . PHP_EOL;
echo '  <generator>Custom Portfolio CMS</generator>' . PHP_EOL;

foreach ($posts as $post) {
    $link = $siteUrl . '/#/blogs/' . $post['slug'];
    $guid = $post['id'];
    $date = date(DATE_RSS, strtotime($post['created_at']));
    $description = $post['excerpt'] ?: ($post['subtitle'] ?: substr(strip_tags($post['content']), 0, 250) . '...');

    echo '  <item>' . PHP_EOL;
    echo '    <title>' . htmlspecialchars($post['title']) . '</title>' . PHP_EOL;
    echo '    <link>' . htmlspecialchars($link) . '</link>' . PHP_EOL;
    echo '    <guid isPermaLink="false">' . htmlspecialchars($guid) . '</guid>' . PHP_EOL;
    echo '    <pubDate>' . htmlspecialchars($date) . '</pubDate>' . PHP_EOL;
    echo '    <description>' . htmlspecialchars($description) . '</description>' . PHP_EOL;
    if ($post['cover_image']) {
        echo '    <enclosure url="' . htmlspecialchars($post['cover_image']) . '" length="0" type="image/jpeg" />' . PHP_EOL;
    }
    echo '    <content:encoded><![CDATA[' . $post['content'] . ']]></content:encoded>' . PHP_EOL;
    echo '  </item>' . PHP_EOL;
}

echo '</channel>' . PHP_EOL;
echo '</rss>';
