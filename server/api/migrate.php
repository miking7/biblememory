<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

// Defence in depth: this script creates tables and reports row counts, so it
// must never be reachable over HTTP even if it is re-routed by accident.
if (PHP_SAPI !== 'cli') {
  http_response_code(404);
  exit;
}

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
  
  // No test-user bootstrap: it seeded a known-credential account
  // (test@example.com / password123) on any empty database. Create accounts
  // through /api/register instead.
  $stmt = $pdo->query('SELECT COUNT(*) FROM users');
  $user_count = (int)$stmt->fetchColumn();
  echo "Database has $user_count user(s)\n";

  echo "\n✓ Migration completed successfully!\n";
  
} catch (Exception $e) {
  echo "\n✗ Migration failed: " . $e->getMessage() . "\n";
  exit(1);
}
