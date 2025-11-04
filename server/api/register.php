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

// Validate email format
if (!is_valid_email($email)) {
  json_out(['error' => 'Invalid email format'], 400);
}

// Validate password length
if (strlen($password) < 8) {
  json_out(['error' => 'Password must be at least 8 characters'], 400);
}

$pdo = db();

// Check if email already exists
$stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
  json_out(['error' => 'Email already registered'], 409);
}

// Create user
$user_id = generate_uuid();
$password_hash = hash_password($password);
$now = now_ms();

$pdo->beginTransaction();

try {
  // Insert user
  $stmt = $pdo->prepare('
    INSERT INTO users (user_id, email, password_hash, created_at, is_active)
    VALUES (?, ?, ?, ?, 1)
  ');
  $stmt->execute([$user_id, $email, $password_hash, $now]);
  
  // Generate and store token
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
  error_log("Registration error: " . $e->getMessage());
  json_out(['error' => 'Failed to create user'], 500);
}
