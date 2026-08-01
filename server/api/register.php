<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Account creation is unauthenticated and each attempt costs a bcrypt hash, so
// cap how many any one address can trigger.
enforce_rate_limit('register:ip:' . client_ip(), 5, 3600,
  'Too many registration attempts - please try again later');

$body = read_json_body(8 * 1024);

$email = normalize_email(require_string($body, 'email', 254));
// bcrypt silently ignores everything past 72 bytes, so reject longer passwords
// outright rather than truncating them without telling the user.
$password = require_string($body, 'password', 72, false);

// Validate email format
if (!is_valid_email($email)) {
  json_out(['error' => 'Invalid email format'], 400);
}

// Validate password length
if (strlen($password) < 8) {
  json_out(['error' => 'Password must be at least 8 characters'], 400);
}

$pdo = db();

// Check if email already exists. Matching is case-insensitive to agree with
// normalize_email, so an address cannot be registered twice under
// different casing.
$stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? COLLATE NOCASE');
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
