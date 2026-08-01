<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

$body = read_json_body(8 * 1024);

// Keep the address exactly as typed alongside the normalised form: legacy rows
// were stored with their original casing, so the raw value is what lets the
// lookup below prefer the specific account the user meant.
$email_raw = require_string($body, 'email', 254);
$email = normalize_email($email_raw);
// Do NOT apply the registration-time 72-byte cap here. Accounts created before
// that cap existed may hold passwords longer than bcrypt's 72-byte window;
// password_verify() truncates identically to password_hash(), so they have
// always authenticated correctly. Rejecting them on length locks those users
// out permanently, and there is no password-reset flow. The bound below only
// stops an oversized body from reaching bcrypt.
$password = require_string($body, 'password', 4096, false);

// Throttle on both axes: per-address to slow a spray across many accounts, and
// per-account so one account cannot be brute-forced from many addresses.
// Each attempt otherwise costs the server a full bcrypt verification.
enforce_rate_limit('login:ip:' . client_ip(), 20, 900,
  'Too many login attempts - please try again in a few minutes');
enforce_rate_limit('login:email:' . $email, 10, 900,
  'Too many login attempts for this account - please try again in a few minutes');

$pdo = db();

// Find candidate accounts case-insensitively. Accounts predating email
// normalisation were stored verbatim under a case-SENSITIVE UNIQUE constraint,
// so 'Bob@x.com' and 'bob@x.com' can both exist; an unordered fetch() returned
// an arbitrary one and could check the password against the wrong account.
$stmt = $pdo->prepare('
  SELECT user_id, email, password_hash, is_active
  FROM users
  WHERE email = ? COLLATE NOCASE
  ORDER BY user_id ASC
');
$stmt->execute([$email]);
$candidates = $stmt->fetchAll();

// Order candidates by how well they match what was typed: the exact string
// first, then the all-lowercase row, then the rest. Normally there is exactly
// one; ordering only matters for legacy case-variant pairs.
usort($candidates, function ($a, $b) use ($email_raw, $email) {
  $score = function ($row) use ($email_raw, $email) {
    if ($row['email'] === $email_raw) return 0;
    if ($row['email'] === $email) return 1;
    return 2;
  };
  return [$score($a), $a['user_id']] <=> [$score($b), $b['user_id']];
});

// Always run a verification, even for an unknown address, so response timing
// does not reveal whether an account exists.
// A real bcrypt hash of a random string: password_verify() returns false on a
// malformed hash almost instantly, which would leave the timing leak open.
$dummy_hash = '$2y$10$ff0OzJ2RWWXJ.xVhAla20edtc.fZeRZJXt8sZhOY/EFgIeXLk4D5.';

// The password is the only thing that can disambiguate legacy case-variant
// accounts, so try candidates in preference order and accept the one it
// actually belongs to. Preferring a single row by casing alone would lock out
// whichever of the pair the heuristic did not pick.
$user = null;
foreach ($candidates as $row) {
  if (verify_password($password, $row['password_hash'])) {
    $user = $row;
    break;
  }
}

if (!$user) {
  if (!$candidates) {
    verify_password($password, $dummy_hash);
  }
  json_out(['error' => 'Invalid email or password'], 401);
}

// Check if user is active
if (!$user['is_active']) {
  json_out(['error' => 'Account is disabled'], 403);
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
