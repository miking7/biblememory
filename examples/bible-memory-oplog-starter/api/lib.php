<?php
declare(strict_types=1);

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $path = __DIR__ . '/db.sqlite';
  $pdo = new PDO('sqlite:' . $path, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  $pdo->exec('PRAGMA journal_mode=WAL;');
  $pdo->exec('PRAGMA foreign_keys=ON;');
  return $pdo;
}

function json_out($arr, int $code=200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

function current_user_id(): string {
  $hdr = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
  if (!$hdr) json_out(["error"=>"missing token"], 401);
  $stmt = db()->prepare('SELECT id FROM users WHERE api_token = ? LIMIT 1');
  $stmt->execute([$hdr]);
  $row = $stmt->fetch();
  if (!$row) json_out(["error"=>"bad token"], 403);
  return (string)$row['id'];
}
