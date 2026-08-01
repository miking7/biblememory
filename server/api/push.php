<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Get authenticated user
$user_id = current_user_id();

// The client pushes at most 500 ops per batch (client/src/sync.ts uses
// db.outbox...limit(500)), so 1000 leaves headroom while bounding what a
// hostile client can write in one request. Per-op size is capped well above
// a long passage but far below what would let one account bloat the shared
// SQLite file. These are per-REQUEST limits deliberately: a lifetime storage
// quota would eventually brick legitimate users, because the oplog is never
// compacted and a rejected batch leaves the client outbox stalled forever.
const MAX_OPS_PER_PUSH = 1000;
const MAX_OP_DATA_BYTES = 65536;

// Allowed shapes, mirroring what actions.ts emits.
const ALLOWED_ENTITIES = ['verse', 'review', 'setting'];
const ALLOWED_ACTIONS  = ['add', 'set', 'patch', 'delete'];

$body = read_json_body(8 * 1024 * 1024);

if (!isset($body['ops']) || !is_array($body['ops'])) {
  json_out(['error' => 'ops must be an array'], 400);
}

$ops = $body['ops'];

if (count($ops) > MAX_OPS_PER_PUSH) {
  json_out(['error' => 'Too many operations in one push (max ' . MAX_OPS_PER_PUSH . ')'], 413);
}

// Process operations in a transaction
$pdo = db();
$pdo->beginTransaction();

try {
  $stmt = $pdo->prepare('
    INSERT OR IGNORE INTO ops (user_id, op_id, ts_client, ts_server, entity, action, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ');
  
  $acked_ids = [];
  $rejected_ids = [];   // accepted-but-oversized ops: reported, never acked
  $now = now_ms();
  
  foreach ($ops as $op) {
    // Validate operation structure. Invalid ops are ACKed rather than silently
    // skipped: they can never become valid, and the client only clears an
    // outbox entry once its id comes back in acked_ids — skipping without
    // acking left such entries retrying on every sync, forever.
    if (!is_array($op) ||
        !isset($op['op_id'], $op['entity'], $op['action']) ||
        !array_key_exists('data', $op) ||
        !is_string($op['op_id']) ||
        !is_string($op['entity']) ||
        !is_string($op['action'])) {
      error_log('Push: dropping structurally invalid op for user ' . $user_id);
      if (isset($op['op_id']) && is_string($op['op_id'])) {
        $acked_ids[] = $op['op_id'];
      }
      continue;
    }

    if (!in_array($op['entity'], ALLOWED_ENTITIES, true) ||
        !in_array($op['action'], ALLOWED_ACTIONS, true)) {
      error_log('Push: dropping op with unknown entity/action for user ' . $user_id);
      $acked_ids[] = $op['op_id'];
      continue;
    }

    $data_json = json_encode($op['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($data_json === false) {
      error_log('Push: dropping op with unencodable data for user ' . $user_id);
      $acked_ids[] = $op['op_id'];
      continue;
    }

    if (strlen($data_json) > MAX_OP_DATA_BYTES) {
      // Skip this op but keep processing the batch. Aborting here used to
      // return 413 with an empty acked_ids, which rolled back every other op
      // AND left them unacked — the client only clears an outbox entry when
      // its id comes back, so one oversized op stalled that device's sync
      // permanently. It is deliberately NOT acked: dropping a verse silently
      // would lose user content, so it stays pending and visible instead.
      error_log('Push: skipping oversized op (' . strlen($data_json) . ' bytes) for user ' . $user_id);
      $rejected_ids[] = $op['op_id'];
      continue;
    }

    $ts_client = isset($op['ts_client']) && is_int($op['ts_client']) ? $op['ts_client'] : $now;

    $stmt->execute([
      $user_id,
      $op['op_id'],
      $ts_client,
      $now, // ts_server
      $op['entity'],
      $op['action'],
      $data_json
    ]);

    $acked_ids[] = $op['op_id'];
  }
  
  // Get current cursor for this user
  $stmt = $pdo->prepare('SELECT COALESCE(MAX(seq), 0) FROM ops WHERE user_id = ?');
  $stmt->execute([$user_id]);
  $cursor = (int)$stmt->fetchColumn();
  
  $pdo->commit();
  
  json_out([
    'ok' => true,
    'acked_ids' => $acked_ids,
    'rejected_ids' => $rejected_ids,
    'cursor' => $cursor
  ]);
  
} catch (Exception $e) {
  $pdo->rollBack();
  error_log("Push error: " . $e->getMessage());
  json_out(['error' => 'Failed to process operations'], 500);
}
