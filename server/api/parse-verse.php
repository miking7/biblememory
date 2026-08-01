<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/verse-parser.php';

handle_cors();

// Get authenticated user (require authentication for API usage)
$user_id = current_user_id();

// This endpoint spends the operator's Anthropic credits, so it is metered per
// account. Registration is open, so without a quota one throwaway account can
// bill an unbounded amount. Input is capped too — input tokens are billed.
const MAX_VERSE_TEXT_BYTES = 20000;
const PARSE_QUOTA_PER_HOUR = 40;
const PARSE_QUOTA_PER_DAY  = 200;

$body = read_json_body(64 * 1024);
$text = require_string($body, 'text', MAX_VERSE_TEXT_BYTES);

if ($text === '') {
  json_out(['error' => 'Text cannot be empty'], 400);
}

enforce_rate_limit(
  'parse:hour:' . $user_id,
  PARSE_QUOTA_PER_HOUR,
  3600,
  'Too many verse parses in the last hour - please try again later or enter the verse manually'
);
enforce_rate_limit(
  'parse:day:' . $user_id,
  PARSE_QUOTA_PER_DAY,
  86400,
  'Daily verse-parsing limit reached - please enter the verse manually or try again tomorrow'
);

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
  
  // Check if AI returned an error object - pass it through directly
  if (isset($parsed['error'])) {
    json_out($parsed, 400);
  }
  
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
  // Detail stays in the server log — it can carry upstream API messages and
  // key-validity hints that should not reach the client.
  error_log('AI parsing error: ' . $e->getMessage());
  json_out([
    'error' => 'Unable to parse verse - please try again or enter manually'
  ], 500);
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
      
      // Parse KEY=VALUE, stripping surrounding quotes so a quoted key is not
      // sent to the upstream API verbatim.
      if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $value = trim($value);
        if (strlen($value) >= 2 &&
            (($value[0] === '"' && substr($value, -1) === '"') ||
             ($value[0] === "'" && substr($value, -1) === "'"))) {
          $value = substr($value, 1, -1);
        }
        putenv(trim($key) . '=' . $value);
      }
    }
  }
}
