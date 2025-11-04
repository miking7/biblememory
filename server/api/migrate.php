<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

echo "Bible Memory App - Database Migration\n";
echo "=====================================\n\n";

$pdo = db();

try {
  // Read schema file
  $schema_file = __DIR__ . '/../schema.sql';
  if (!file_exists($schema_file)) {
    die("Error: schema.sql not found at $schema_file\n");
  }
  
  $schema = file_get_contents($schema_file);
  
  // Execute schema
  echo "Creating database tables...\n";
  $pdo->exec($schema);
  echo "✓ Tables created successfully\n\n";
  
  // Check if we should create a test user
  $stmt = $pdo->query('SELECT COUNT(*) FROM users');
  $user_count = (int)$stmt->fetchColumn();
  
  if ($user_count === 0) {
    echo "No users found. Creating test user...\n";
    
    $user_id = generate_uuid();
    $email = 'test@example.com';
    $password = 'password123';
    $password_hash = hash_password($password);
    $now = now_ms();
    
    // Create user
    $stmt = $pdo->prepare('
      INSERT INTO users (user_id, email, password_hash, created_at, is_active)
      VALUES (?, ?, ?, ?, 1)
    ');
    $stmt->execute([$user_id, $email, $password_hash, $now]);
    
    // Generate token
    $token = generate_token();
    $token_hash = hash('sha256', $token);
    
    $stmt = $pdo->prepare('
      INSERT INTO tokens (token, user_id, created_at)
      VALUES (?, ?, ?)
    ');
    $stmt->execute([$token_hash, $user_id, $now]);
    
    echo "✓ Test user created\n";
    echo "\nTest User Credentials:\n";
    echo "  Email: $email\n";
    echo "  Password: $password\n";
    echo "  User ID: $user_id\n";
    echo "  Token: $token\n";
    echo "\nIMPORTANT: Change these credentials in production!\n";
  } else {
    echo "Database already has $user_count user(s)\n";
  }
  
  echo "\n✓ Migration completed successfully!\n";
  
} catch (Exception $e) {
  echo "\n✗ Migration failed: " . $e->getMessage() . "\n";
  exit(1);
}
