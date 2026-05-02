<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

$db = getDb();

// Fetch all published blogs
$stmt = $db->prepare("SELECT slug, updated_at, created_at FROM blogs WHERE published = 1 ORDER BY created_at DESC");
$stmt->execute();
$blogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$baseUrl = "$protocol://$host";

header("Content-Type: application/xml; charset=utf-8");

echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

// Home page
echo '<url>';
echo '<loc>' . $baseUrl . '/</loc>';
echo '<changefreq>weekly</changefreq>';
echo '<priority>1.0</priority>';
echo '</url>';

// Blogs main page
echo '<url>';
echo '<loc>' . $baseUrl . '/#/blogs</loc>';
echo '<changefreq>daily</changefreq>';
echo '<priority>0.8</priority>';
echo '</url>';

// Contact page
echo '<url>';
echo '<loc>' . $baseUrl . '/#/contact</loc>';
echo '<changefreq>monthly</changefreq>';
echo '<priority>0.5</priority>';
echo '</url>';

// Blog posts
foreach ($blogs as $blog) {
    $lastMod = !empty($blog['updated_at']) ? $blog['updated_at'] : $blog['created_at'];
    $date = date('c', strtotime($lastMod));
    echo '<url>';
    echo '<loc>' . $baseUrl . '/#/blogs/' . $blog['slug'] . '</loc>';
    echo '<lastmod>' . $date . '</lastmod>';
    echo '<changefreq>monthly</changefreq>';
    echo '<priority>0.7</priority>';
    echo '</url>';
}

echo '</urlset>';
