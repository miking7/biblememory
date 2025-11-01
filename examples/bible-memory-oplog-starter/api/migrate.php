<?php
require __DIR__.'/lib.php';
$pdo = db();

$pdo->exec('CREATE TABLE IF NOT EXISTS ops (
  seq       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   TEXT NOT NULL,
  op_id     TEXT NOT NULL UNIQUE,
  ts_server INTEGER NOT NULL DEFAULT (strftime(''%%s'',''now'')*1000),
  ts_client INTEGER,
  entity    TEXT NOT NULL,
  action    TEXT NOT NULL,
  data_json TEXT NOT NULL
)');
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_ops_user_seq ON ops(user_id, seq)');

$pdo->exec('CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  api_token TEXT UNIQUE NOT NULL
)');

$count = (int)$pdo->query('SELECT COUNT(*) AS c FROM users')->fetch()['c'];
header('Content-Type: text/plain; charset=utf-8');
if ($count === 0) {
  $id = 'user-' . bin2hex(random_bytes(4));
  $token = bin2hex(random_bytes(16));
  $stmt = $pdo->prepare('INSERT INTO users(id, api_token) VALUES(?, ?)');
  $stmt->execute([$id, $token]);
  echo "Created initial user:\nuser_id: $id\napi_token: $token\n";
  exit;
}
echo "DB ready. Users present: $count\n";
