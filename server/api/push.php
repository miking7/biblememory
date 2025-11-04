<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Get authenticated user
$user_id = current_user_id();

// Parse request body
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || !isset($body['ops'])) {
  json_out(['error' => 'Invalid request body'], 400);
}

$ops = $body['ops'];

if (!is_array($ops)) {
  json_out(['error' => 'ops must be an array'], 400);
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
  $now = now_ms();
  
  foreach ($ops as $op) {
    // Validate operation structure
    if (!isset($op['op_id']) || !isset($op['entity']) || !isset($op['action']) || !isset($op['data'])) {
      continue; // Skip invalid operations
    }
    
    $stmt->execute([
      $user_id,
      $op['op_id'],
      $op['ts_client'] ?? $now,
      $now, // ts_server
      $op['entity'],
      $op['action'],
      json_encode($op['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
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
    'cursor' => $cursor
  ]);
  
} catch (Exception $e) {
  $pdo->rollBack();
  error_log("Push error: " . $e->getMessage());
  json_out(['error' => 'Failed to process operations'], 500);
}
