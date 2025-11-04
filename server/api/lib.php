<?php
declare(strict_types=1);

// Database connection
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  
  $path = __DIR__ . '/db.sqlite';
  $pdo = new PDO('sqlite:' . $path, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  
  // Enable WAL mode for better concurrency
  $pdo->exec('PRAGMA journal_mode=WAL;');
  $pdo->exec('PRAGMA foreign_keys=ON;');
  
  return $pdo;
}

// JSON response helper
function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
  
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Get current user ID from auth token
function current_user_id(): string {
  $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
  
  if (!$token) {
    json_out(['error' => 'Missing authentication token'], 401);
  }
  
  // Hash the token for comparison (tokens are stored hashed)
  $token_hash = hash('sha256', $token);
  
  $stmt = db()->prepare('
    SELECT user_id 
    FROM tokens 
    WHERE token = ? 
      AND revoked_at IS NULL
    LIMIT 1
  ');
  $stmt->execute([$token_hash]);
  $row = $stmt->fetch();
  
  if (!$row) {
    json_out(['error' => 'Invalid or revoked token'], 403);
  }
  
  // Update last_used_at
  $stmt = db()->prepare('
    UPDATE tokens 
    SET last_used_at = ? 
    WHERE token = ?
  ');
  $stmt->execute([time() * 1000, $token_hash]);
  
  return (string)$row['user_id'];
}

// Generate a secure random token
function generate_token(): string {
  return bin2hex(random_bytes(32)); // 64-char hex string
}

// Hash a password
function hash_password(string $password): string {
  return password_hash($password, PASSWORD_DEFAULT);
}

// Verify a password
function verify_password(string $password, string $hash): bool {
  return password_verify($password, $hash);
}

// Generate a UUID v4
function generate_uuid(): string {
  $data = random_bytes(16);
  $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
  $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant
  
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// Validate email format
function is_valid_email(string $email): bool {
  return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Get current timestamp in milliseconds
function now_ms(): int {
  return (int)(microtime(true) * 1000);
}

// Handle CORS preflight requests
function handle_cors(): void {
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
  }
}
