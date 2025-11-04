<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Get authenticated user (this validates the token)
$user_id = current_user_id();

// Get the token from header
$token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
$token_hash = hash('sha256', $token);

$pdo = db();
$now = now_ms();

// Revoke the token
$stmt = $pdo->prepare('
  UPDATE tokens 
  SET revoked_at = ? 
  WHERE token = ? AND user_id = ?
');
$stmt->execute([$now, $token_hash, $user_id]);

json_out(['ok' => true]);
