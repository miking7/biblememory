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

// Origins allowed to call the API cross-origin. The PWA itself is served from
// the same origin as the API, so this list only needs the dev/test hosts plus
// production; a wildcard would let any site drive register/login/parse-verse.
const ALLOWED_ORIGINS = [
  'https://bible-memory.app',
  'https://www.bible-memory.app',
  'https://biblememory.test',
  'http://localhost:3000',
  'http://localhost:5173',
];

// Emit CORS headers, echoing the origin only when it is on the allowlist.
// Requests with no Origin header (same-origin fetches, curl, the PWA itself)
// need no CORS headers at all.
function cors_headers(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin !== '' && in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
  }
}

// JSON response helper
function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  cors_headers();

  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Read and JSON-decode the request body, rejecting anything that is not a
// JSON object. Bodies larger than $max_bytes are refused outright.
function read_json_body(int $max_bytes = 1048576): array {
  // Reject on the declared length first: reading the stream and measuring it
  // afterwards allocates the whole body before the limit can refuse it, so the
  // cap bounded nothing.
  $declared = $_SERVER['CONTENT_LENGTH'] ?? null;
  if ($declared !== null && is_numeric($declared) && (int)$declared > $max_bytes) {
    json_out(['error' => 'Request body too large'], 413);
  }

  // Read one byte past the cap so an absent or lying Content-Length still
  // cannot force an unbounded allocation.
  $stream = fopen('php://input', 'rb');
  if ($stream === false) {
    json_out(['error' => 'Could not read request body'], 400);
  }
  $raw = stream_get_contents($stream, $max_bytes + 1);
  fclose($stream);

  if ($raw === false) {
    json_out(['error' => 'Could not read request body'], 400);
  }
  if (strlen($raw) > $max_bytes) {
    json_out(['error' => 'Request body too large'], 413);
  }
  $body = json_decode($raw, true);
  if (!is_array($body)) {
    json_out(['error' => 'Invalid request body'], 400);
  }
  return $body;
}

// Fetch a required string field. Under declare(strict_types=1) passing a JSON
// array/int/bool straight into trim()/strlen() raises an uncaught TypeError
// (a 500 that can leak paths when display_errors is on), so every string input
// is funnelled through here first.
function require_string(array $body, string $key, int $max_len, bool $trim = true): string {
  if (!isset($body[$key]) || !is_string($body[$key])) {
    json_out(['error' => "Field '$key' must be a string"], 400);
  }
  $value = $trim ? trim($body[$key]) : $body[$key];
  if (strlen($value) > $max_len) {
    json_out(['error' => "Field '$key' is too long"], 400);
  }
  return $value;
}

// Tokens go stale after a year of no use. last_used_at is refreshed on every
// authenticated request, so this only ever logs out a device that has not
// opened the app in that window — it does not disturb normal offline-first use.
const TOKEN_IDLE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// Get current user ID from auth token
function current_user_id(): string {
  $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';

  if (!is_string($token) || $token === '') {
    json_out(['error' => 'Missing authentication token'], 401);
  }

  // Hash the token for comparison (tokens are stored hashed)
  $token_hash = hash('sha256', $token);

  // Join users so a deactivated account cannot keep using tokens minted
  // before it was disabled — login.php's is_active check alone left every
  // existing session working.
  $stmt = db()->prepare('
    SELECT t.user_id, t.created_at, t.last_used_at
    FROM tokens t
    JOIN users u ON u.user_id = t.user_id
    WHERE t.token = ?
      AND t.revoked_at IS NULL
      AND u.is_active = 1
    LIMIT 1
  ');
  $stmt->execute([$token_hash]);
  $row = $stmt->fetch();

  if (!$row) {
    json_out(['error' => 'Invalid or revoked token'], 403);
  }

  $now = now_ms();
  $last_seen = (int)($row['last_used_at'] ?? 0) ?: (int)$row['created_at'];

  if ($now - $last_seen > TOKEN_IDLE_TTL_MS) {
    $stmt = db()->prepare('UPDATE tokens SET revoked_at = ? WHERE token = ?');
    $stmt->execute([$now, $token_hash]);
    json_out(['error' => 'Session expired, please sign in again'], 403);
  }

  // Update last_used_at
  $stmt = db()->prepare('
    UPDATE tokens
    SET last_used_at = ?
    WHERE token = ?
  ');
  $stmt->execute([$now, $token_hash]);

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
    cors_headers();
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
  }
}

// Best-effort client identifier for throttling. REMOTE_ADDR only — deliberately
// NOT X-Forwarded-For, which is attacker-controlled unless a trusted proxy is
// known to strip it. If a CDN is ever put in front of this app, every caller
// collapses onto the proxy's address, so throttles that must not lock out all
// users at once are keyed on an account/email as well.
function client_ip(): string {
  return (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

// Sliding-window counter shared by the login/register throttles and the
// parse-verse quota. Returns true when the caller is still under the limit.
// Rows are keyed by an arbitrary bucket string and pruned as they expire.
function rate_limit_ok(string $bucket, int $limit, int $window_seconds): bool {
  $pdo = db();
  $pdo->exec('CREATE TABLE IF NOT EXISTS rate_limits (
    bucket TEXT NOT NULL,
    ts INTEGER NOT NULL
  )');
  $pdo->exec('CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_ts ON rate_limits(bucket, ts)');

  $now = now_ms();
  $cutoff = $now - ($window_seconds * 1000);

  $stmt = $pdo->prepare('DELETE FROM rate_limits WHERE bucket = ? AND ts < ?');
  $stmt->execute([$bucket, $cutoff]);

  $stmt = $pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE bucket = ? AND ts >= ?');
  $stmt->execute([$bucket, $cutoff]);

  if ((int)$stmt->fetchColumn() >= $limit) {
    return false;
  }

  $stmt = $pdo->prepare('INSERT INTO rate_limits (bucket, ts) VALUES (?, ?)');
  $stmt->execute([$bucket, $now]);
  return true;
}

// Reject with 429 when a bucket is over its limit.
function enforce_rate_limit(string $bucket, int $limit, int $window_seconds, string $message): void {
  if (!rate_limit_ok($bucket, $limit, $window_seconds)) {
    header('Retry-After: ' . $window_seconds);
    json_out(['error' => $message], 429);
  }
}

// Normalise an email for storage and lookup. Addresses were previously stored
// verbatim, so Alice@x.com and alice@x.com could register as two accounts.
function normalize_email(string $email): string {
  return strtolower(trim($email));
}
