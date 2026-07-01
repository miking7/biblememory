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

// Resume point for the next page: the last op in this page, or the incoming
// `since` when the page is empty (nothing new).
$op_count = count($ops);
$next_cursor = $op_count > 0 ? (int)$ops[$op_count - 1]['seq'] : $since;

// Whether more ops remain beyond this page. A short page is definitively the
// last one; a full page needs an existence check.
if ($op_count < $limit) {
  $has_more = false;
} else {
  $stmt = $pdo->prepare('SELECT 1 FROM ops WHERE user_id = ? AND seq > ? LIMIT 1');
  $stmt->execute([$user_id, $next_cursor]);
  $has_more = $stmt->fetchColumn() !== false;
}

// Server head for this user. Informational only — this is NOT a "caught up"
// marker; clients must page using next_cursor + has_more (trusting this as the
// cursor after one page is what silently skipped ops before).
$stmt = $pdo->prepare('SELECT COALESCE(MAX(seq), 0) FROM ops WHERE user_id = ?');
$stmt->execute([$user_id]);
$cursor = (int)$stmt->fetchColumn();

json_out([
  'cursor' => $cursor,
  'next_cursor' => $next_cursor,
  'has_more' => $has_more,
  'ops' => $ops
]);
