<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Parse request body
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || !isset($body['email']) || !isset($body['password'])) {
  json_out(['error' => 'Email and password are required'], 400);
}

$email = trim($body['email']);
$password = $body['password'];

$pdo = db();

// Find user by email
$stmt = $pdo->prepare('
  SELECT user_id, password_hash, is_active 
  FROM users 
  WHERE email = ?
');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
  json_out(['error' => 'Invalid email or password'], 401);
}

// Check if user is active
if (!$user['is_active']) {
  json_out(['error' => 'Account is disabled'], 403);
}

// Verify password
if (!verify_password($password, $user['password_hash'])) {
  json_out(['error' => 'Invalid email or password'], 401);
}

$user_id = $user['user_id'];
$now = now_ms();

$pdo->beginTransaction();

try {
  // Update last login
  $stmt = $pdo->prepare('UPDATE users SET last_login_at = ? WHERE user_id = ?');
  $stmt->execute([$now, $user_id]);
  
  // Generate and store new token
  $token = generate_token();
  $token_hash = hash('sha256', $token);
  
  $stmt = $pdo->prepare('
    INSERT INTO tokens (token, user_id, created_at)
    VALUES (?, ?, ?)
  ');
  $stmt->execute([$token_hash, $user_id, $now]);
  
  $pdo->commit();
  
  json_out([
    'user_id' => $user_id,
    'token' => $token
  ]);
  
} catch (Exception $e) {
  $pdo->rollBack();
  error_log("Login error: " . $e->getMessage());
  json_out(['error' => 'Failed to create session'], 500);
}
