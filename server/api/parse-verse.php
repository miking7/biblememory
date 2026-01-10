<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/verse-parser.php';

handle_cors();

// Get authenticated user (require authentication for API usage)
$user_id = current_user_id();

// Parse request body
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || !isset($body['text'])) {
  json_out(['error' => 'Invalid request body - text field required'], 400);
}

$text = trim($body['text']);

if (empty($text)) {
  json_out(['error' => 'Text cannot be empty'], 400);
}

// Load environment variables
loadEnv();

// Get Anthropic API key
$apiKey = getenv('ANTHROPIC_API_KEY');
if (!$apiKey) {
  error_log('ANTHROPIC_API_KEY not configured in .env file');
  json_out(['error' => 'AI service not configured - please contact administrator'], 500);
}

// Call Anthropic API to parse the verse
try {
  $parsed = callAnthropicAPI($apiKey, $text);
  $result = processAIResponse($parsed, $text);
  
  // Return parsed data with tags field
  json_out([
    'reference' => $result['reference'],
    'refSort' => $result['refSort'],
    'content' => $result['content'],
    'translation' => $result['translation'],
    'tags' => []
  ]);
  
} catch (Exception $e) {
  error_log('AI parsing error: ' . $e->getMessage());
  json_out(['error' => 'Unable to parse verse - please try again or enter manually'], 500);
}

/**
 * Load environment variables from .env file
 */
function loadEnv() {
  $envFile = __DIR__ . '/../../.env';
  if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
      // Skip comments
      if (strpos(trim($line), '#') === 0) continue;
      
      // Parse KEY=VALUE
      if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
      }
    }
  }
}
