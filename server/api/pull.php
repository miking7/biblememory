<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Get authenticated user
$user_id = current_user_id();

// Get query parameters
$since = isset($_GET['since']) ? (int)$_GET['since'] : 0;
$limit = isset($_GET['limit']) ? min(2000, max(1, (int)$_GET['limit'])) : 500;

// Fetch operations since cursor
$pdo = db();
$stmt = $pdo->prepare('
  SELECT seq, op_id, ts_server, ts_client, entity, action, data_json
  FROM ops 
  WHERE user_id = ? AND seq > ? 
  ORDER BY seq ASC 
  LIMIT ?
');
$stmt->execute([$user_id, $since, $limit]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Transform rows to operation format
$ops = array_map(function($row) {
  return [
    'seq' => (int)$row['seq'],
    'op_id' => $row['op_id'],
    'ts_server' => (int)$row['ts_server'],
    'ts_client' => $row['ts_client'] !== null ? (int)$row['ts_client'] : null,
    'entity' => $row['entity'],
    'action' => $row['action'],
    'data' => json_decode($row['data_json'], true)
  ];
}, $rows);

// Get current cursor for this user
$stmt = $pdo->prepare('SELECT COALESCE(MAX(seq), 0) FROM ops WHERE user_id = ?');
$stmt->execute([$user_id]);
$cursor = (int)$stmt->fetchColumn();

json_out([
  'cursor' => $cursor,
  'ops' => $ops
]);
