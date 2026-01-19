<?php
/**
 * PHP Built-in Server Router
 * 
 * This file is used by PHP's built-in server to route requests.
 * Start server with: php -S localhost:8000 router.php
 */

$requestUri = $_SERVER['REQUEST_URI'];
$requestPath = parse_url($requestUri, PHP_URL_PATH);

// Serve static files from dist/ directory
if (preg_match('/\.(js|css|html|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webmanifest|json|xml|txt)$/', $requestPath)) {
    $file = __DIR__ . '/dist' . $requestPath;
    if (file_exists($file) && is_file($file)) {
        // Determine content type
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $contentTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'html' => 'text/html; charset=utf-8',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'webmanifest' => 'application/manifest+json',
            'json' => 'application/json',
            'xml' => 'application/xml; charset=utf-8',
            'txt' => 'text/plain; charset=utf-8',
        ];
        
        if (isset($contentTypes[$ext])) {
            header('Content-Type: ' . $contentTypes[$ext]);
        }
        
        readfile($file);
        return;
    }
}

// All other requests go through index.php
require __DIR__ . '/index.php';
