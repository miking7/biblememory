<?php
require __DIR__.'/lib.php';
$user_id = current_user_id();

$since = isset($_GET['since']) ? (int)$_GET['since'] : 0;
$limit = isset($_GET['limit']) ? min(2000, max(1, (int)$_GET['limit'])) : 500;

$pdo = db();
$stmt = $pdo->prepare('SELECT seq, op_id, ts_server, ts_client, entity, action, data_json
                       FROM ops WHERE user_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?');
$stmt->execute([$user_id, $since, $limit]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$ops = array_map(function($r){
  return [
    "seq"       => (int)$r['seq'],
    "op_id"     => $r['op_id'],
    "ts_server" => (int)$r['ts_server'],
    "ts_client" => $r['ts_client'] !== null ? (int)$r['ts_client'] : null,
    "entity"    => $r['entity'],
    "action"    => $r['action'],
    "data"      => json_decode($r['data_json'], true)
  ];
}, $rows);

$cursor = (int)$pdo->query("SELECT COALESCE(MAX(seq),0) FROM ops WHERE user_id=".$pdo->quote($user_id))->fetchColumn();
json_out(["cursor"=>$cursor, "ops"=>$ops]);
