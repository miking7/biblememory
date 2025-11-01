<?php
require __DIR__.'/lib.php';
$user_id = current_user_id();

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
$ops  = $body['ops'] ?? [];

$pdo = db();
$pdo->beginTransaction();
$ins = $pdo->prepare('INSERT OR IGNORE INTO ops (user_id, op_id, ts_client, entity, action, data_json)
                      VALUES (?, ?, ?, ?, ?, ?)');

$acked = [];
foreach ($ops as $op) {
  $ins->execute([
    $user_id,
    $op['op_id'],
    $op['ts_client'] ?? null,
    $op['entity'],
    $op['action'],
    json_encode($op['data'], JSON_UNESCAPED_UNICODE)
  ]);
  $acked[] = $op['op_id'];
}

$cursor = (int)$pdo->query("SELECT COALESCE(MAX(seq),0) AS s FROM ops WHERE user_id=".$pdo->quote($user_id))->fetchColumn();
$pdo->commit();
json_out(["ok"=>true, "acked_ids"=>$acked, "cursor"=>$cursor]);
