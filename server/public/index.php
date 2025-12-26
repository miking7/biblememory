<?php
/**
 * Bible Memory App - Main Entry Point
 * 
 * This file routes all requests:
 * - /api/* requests go to the API endpoints
 * - All other requests serve the SPA
 */

// Get the request URI and method
$requestUri = $_SERVER['REQUEST_URI'];
$requestPath = parse_url($requestUri, PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove any query string for routing decisions
$path = strtok($requestPath, '?');

// API Routes
$apiRoutes = [
    'POST /api/register' => __DIR__ . '/../api/register.php',
    'POST /api/login' => __DIR__ . '/../api/login.php',
    'POST /api/logout' => __DIR__ . '/../api/logout.php',
    'POST /api/push' => __DIR__ . '/../api/push.php',
    'GET /api/pull' => __DIR__ . '/../api/pull.php',
    'POST /api/migrate' => __DIR__ . '/../api/migrate.php',
];

// Check if this is an API request
if (strpos($path, '/api/') === 0) {
    $route = $requestMethod . ' ' . $path;
    
    if (isset($apiRoutes[$route]) && file_exists($apiRoutes[$route])) {
        require $apiRoutes[$route];
        exit;
    } else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'API endpoint not found',
            'path' => $path,
            'method' => $requestMethod
        ]);
        exit;
    }
}

// For PHP's built-in server, let it serve static files directly
if (php_sapi_name() === 'cli-server') {
    $file = __DIR__ . '/dist' . $path;
    if (is_file($file)) {
        return false; // Let PHP's built-in server handle it
    }
}

// Serve static assets from dist/
if (strpos($path, '/assets/') === 0 || $path === '/favicon.ico') {
    $assetPath = __DIR__ . '/dist' . $path;
    if (file_exists($assetPath) && is_file($assetPath)) {
        // Determine content type
        $ext = pathinfo($assetPath, PATHINFO_EXTENSION);
        $contentTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
        ];
        
        if (isset($contentTypes[$ext])) {
            header('Content-Type: ' . $contentTypes[$ext]);
        }
        
        readfile($assetPath);
        exit;
    }
}

// TEMPORARY: Serve legacy app static files
// TODO: Remove this block once legacy app is no longer needed (Phase 2+)
// The legacy jQuery app is a transitional tool while building new Vue.js features
if (strpos($path, '/legacy/') === 0 || $path === '/legacy') {
    $legacyPath = __DIR__ . '/dist' . $path;
    
    // Default to index.html if requesting /legacy/ directory
    if (is_dir($legacyPath)) {
        $legacyPath .= '/index.html';
    }
    
    if (file_exists($legacyPath) && is_file($legacyPath)) {
        // Determine content type
        $ext = pathinfo($legacyPath, PATHINFO_EXTENSION);
        $contentTypes = [
            'html' => 'text/html; charset=utf-8',
            'js' => 'application/javascript',
            'css' => 'text/css',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
        ];
        
        if (isset($contentTypes[$ext])) {
            header('Content-Type: ' . $contentTypes[$ext]);
        }
        
        readfile($legacyPath);
        exit;
    }
    
    // Legacy file not found
    http_response_code(404);
    echo '404 - Legacy file not found';
    exit;
}

// Serve the SPA for all other requests
$indexPath = __DIR__ . '/dist/index.html';

if (file_exists($indexPath)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexPath);
} else {
    // Development message if dist hasn't been built yet
    http_response_code(503);
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bible Memory App - Build Required</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
            }
            h1 { margin: 0 0 1rem 0; }
            code {
                background: rgba(0, 0, 0, 0.3);
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                display: inline-block;
                margin: 1rem 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📖 Bible Memory App</h1>
            <p>The frontend needs to be built first.</p>
            <p>Run the following command:</p>
            <code>cd client && npm run build</code>
            <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.8;">
                For development, run: <code>npm run dev</code>
            </p>
        </div>
    </body>
    </html>
    <?php
}
