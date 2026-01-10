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
    'POST /api/parse-verse' => __DIR__ . '/../api/parse-verse.php',
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

// Serve static assets from dist/ (generic approach)
// Allow any file in dist/ with safe extensions (PWA-friendly)
$ext = pathinfo($path, PATHINFO_EXTENSION);
$allowedExtensions = ['js', 'css', 'html', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
                      'woff', 'woff2', 'ttf', 'webmanifest', 'json'];

if (in_array($ext, $allowedExtensions, true)) {
    $assetPath = __DIR__ . '/dist' . $path;

    // Security: Prevent directory traversal
    $realAssetPath = realpath($assetPath);
    $realDistPath = realpath(__DIR__ . '/dist');

    if ($realAssetPath && $realDistPath &&
        strpos($realAssetPath, $realDistPath) === 0 &&
        is_file($realAssetPath)) {

        // Determine content type
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
        ];

        if (isset($contentTypes[$ext])) {
            header('Content-Type: ' . $contentTypes[$ext]);
        }

        readfile($realAssetPath);
        exit;
    }
}

// TEMPORARY: Handle directory requests (redirect to index.html)
// Primarily for legacy app: /legacy/ → /legacy/index.html
// TODO: Remove this block once legacy app is no longer needed (Phase 2+)
if ($path === '/legacy' || $path === '/legacy/') {
    header('Location: /legacy/index.html');
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
