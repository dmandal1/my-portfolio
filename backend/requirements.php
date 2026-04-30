<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$checks = [];

// PHP version >= 8.0
$phpVersion = PHP_VERSION;
$checks[] = [
    'label'  => 'PHP Version',
    'value'  => $phpVersion,
    'pass'   => version_compare($phpVersion, '8.0.0', '>='),
    'note'   => 'PHP 8.0 or higher required',
];

// PDO MySQL
$checks[] = [
    'label' => 'PDO MySQL',
    'value' => extension_loaded('pdo_mysql') ? 'Enabled' : 'Missing',
    'pass'  => extension_loaded('pdo_mysql'),
    'note'  => 'Required for database connections',
];

// JSON extension
$checks[] = [
    'label' => 'JSON Extension',
    'value' => extension_loaded('json') ? 'Enabled' : 'Missing',
    'pass'  => extension_loaded('json'),
    'note'  => 'Required for API responses',
];

// File upload
$checks[] = [
    'label' => 'File Uploads',
    'value' => ini_get('file_uploads') ? 'Enabled' : 'Disabled',
    'pass'  => (bool)ini_get('file_uploads'),
    'note'  => 'Required for image uploads',
];

// Writable: api/ dir (to write config.php)
$apiWritable = is_writable(__DIR__);
$checks[] = [
    'label' => 'api/ Writable',
    'value' => $apiWritable ? 'Writable' : 'Not Writable',
    'pass'  => $apiWritable,
    'note'  => 'Needed to write config.php during install',
];

// Writable: public_html/ (to write installed.lock + uploads/)
$rootWritable = is_writable(dirname(__DIR__));
$checks[] = [
    'label' => 'Root Writable',
    'value' => $rootWritable ? 'Writable' : 'Not Writable',
    'pass'  => $rootWritable,
    'note'  => 'Needed to create uploads/ and installed.lock',
];

// Upload max filesize
$uploadMax = ini_get('upload_max_filesize');
$checks[] = [
    'label' => 'Max Upload Size',
    'value' => $uploadMax,
    'pass'  => true,
    'note'  => 'Recommended: 10M or higher',
];

$allPass = !in_array(false, array_column($checks, 'pass'), true);

echo json_encode(['checks' => $checks, 'allPass' => $allPass]);
