<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

handle_cors();

// Get authenticated user (require authentication for API usage)
$user_id = current_user_id();

// Determine if this is a list request or a specific collection request
$collection_id = $_GET['id'] ?? null;

if ($collection_id) {
  // Get specific collection verses
  get_collection_verses($collection_id);
} else {
  // List all collections
  list_collections();
}

/**
 * List all available collections
 */
function list_collections(): void {
  $collections_file = __DIR__ . '/../data/collections.json';

  if (!file_exists($collections_file)) {
    json_out(['error' => 'Collections data not found'], 500);
  }

  $json = file_get_contents($collections_file);
  $collections = json_decode($json, true);

  if (!is_array($collections)) {
    json_out(['error' => 'Invalid collections data'], 500);
  }

  json_out($collections);
}

/**
 * Get verses for a specific collection
 */
function get_collection_verses(string $collection_id): void {
  // Validate collection ID format (alphanumeric and hyphens only)
  if (!preg_match('/^[a-z0-9\-]+$/', $collection_id)) {
    json_out(['error' => 'Invalid collection ID'], 400);
  }

  $collection_file = __DIR__ . '/../data/collections/' . $collection_id . '.json';

  if (!file_exists($collection_file)) {
    json_out(['error' => 'Collection not found'], 404);
  }

  $json = file_get_contents($collection_file);
  $verses = json_decode($json, true);

  if (!is_array($verses)) {
    json_out(['error' => 'Invalid collection data'], 500);
  }

  json_out($verses);
}
