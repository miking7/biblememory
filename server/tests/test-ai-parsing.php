#!/usr/bin/env php
<?php
/**
 * AI Verse Parsing Integration Test Runner
 * 
 * Tests the AI parsing endpoint with real verses to validate:
 * - Consistency over time (AI model changes)
 * - Accuracy of parsing
 * - Prompt effectiveness
 * 
 * Usage:
 *   php server/tests/test-ai-parsing.php           # Run all tests
 *   php server/tests/test-ai-parsing.php --update  # Update expected files
 *   php server/tests/test-ai-parsing.php --verbose # Show detailed output
 *   php server/tests/test-ai-parsing.php 01-*      # Run specific test(s)
 */

// Load shared verse parsing logic FIRST
require_once dirname(__DIR__) . '/api/verse-parser.php';

// Color output helpers
function color($text, $color) {
  $colors = [
    'red' => "\033[31m",
    'green' => "\033[32m",
    'yellow' => "\033[33m",
    'blue' => "\033[34m",
    'magenta' => "\033[35m",
    'cyan' => "\033[36m",
    'white' => "\033[37m",
    'reset' => "\033[0m",
    'bold' => "\033[1m",
  ];
  return $colors[$color] . $text . $colors['reset'];
}

// Parse command line options
$options = [
  'update' => in_array('--update', $argv),
  'verbose' => in_array('--verbose', $argv),
  'pattern' => null,
];

foreach ($argv as $arg) {
  if ($arg !== $argv[0] && !str_starts_with($arg, '--')) {
    $options['pattern'] = $arg;
  }
}

// Setup paths
$testsDir = __DIR__;
$versesDir = $testsDir . '/test-verses';
$expectedDir = $testsDir . '/expected';
$serverDir = dirname($testsDir);

// Ensure expected directory exists
if (!is_dir($expectedDir)) {
  mkdir($expectedDir, 0755, true);
}

// Load environment variables
loadEnv($serverDir . '/../.env');

// Get API key
$apiKey = getenv('ANTHROPIC_API_KEY');
if (!$apiKey) {
  echo color("❌ Error: ANTHROPIC_API_KEY not found in .env file\n", 'red');
  exit(1);
}

// Get test verse files
$verseFiles = glob($versesDir . '/*.txt');
if (empty($verseFiles)) {
  echo color("❌ No test verse files found in {$versesDir}\n", 'red');
  exit(1);
}

// Filter by pattern if specified
if ($options['pattern']) {
  $verseFiles = array_filter($verseFiles, function($file) use ($options) {
    return fnmatch('*' . $options['pattern'] . '*', basename($file));
  });
  if (empty($verseFiles)) {
    echo color("❌ No test files match pattern: {$options['pattern']}\n", 'red');
    exit(1);
  }
}

sort($verseFiles);

// Print header
echo "\n";
echo color("🧪 Bible Verse AI Parsing Integration Tests\n", 'bold');
echo color("=" . str_repeat("=", 47) . "\n", 'cyan');
echo "\n";

// Test statistics
$stats = [
  'passed' => 0,
  'failed' => 0,
  'created' => 0,
  'skipped' => 0,
];

// Run tests
foreach ($verseFiles as $verseFile) {
  $testName = basename($verseFile, '.txt');
  $expectedFile = $expectedDir . '/' . $testName . '.json';
  
  echo "Testing: " . color($testName . '.txt', 'bold') . "\n";
  
  // Read verse text
  $verseText = file_get_contents($verseFile);
  
  // Call API
  try {
    $result = callParseAPI($apiKey, $verseText);
    
    if ($options['verbose']) {
      echo "  AI Response:\n";
      echo "  " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
    }
    
    // Check if expected file exists
    if (!file_exists($expectedFile)) {
      echo color("  ⚠️  No expected file found\n", 'yellow');
      
      // Show the result
      echo "\n  AI Response:\n";
      echo "  " . str_repeat("-", 60) . "\n";
      echo "  " . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
      echo "  " . str_repeat("-", 60) . "\n\n";
      
      // Ask to create expected file
      echo "  Create this as the expected result? [y/N]: ";
      $handle = fopen("php://stdin", "r");
      $line = trim(fgets($handle));
      fclose($handle);
      
      if (strtolower($line) === 'y') {
        file_put_contents($expectedFile, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        echo color("  ✅ Expected file created\n", 'green');
        $stats['created']++;
      } else {
        echo color("  ⏭️  Skipped\n", 'yellow');
        $stats['skipped']++;
      }
    } else {
      // Load expected result
      $expected = json_decode(file_get_contents($expectedFile), true);
      
      // Compare results
      $differences = compareResults($expected, $result);
      
      if (empty($differences)) {
        echo color("  ✅ PASS\n", 'green');
        $stats['passed']++;
      } else {
        echo color("  ❌ FAIL\n", 'red');
        $stats['failed']++;
        
        // Show differences
        foreach ($differences as $field => $diff) {
          echo color("     Field: {$field}\n", 'yellow');
          echo "       Expected: " . json_encode($diff['expected']) . "\n";
          echo "       Got:      " . json_encode($diff['actual']) . "\n";
        }
        
        // Offer to update in update mode
        if ($options['update']) {
          file_put_contents($expectedFile, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
          echo color("     Updated expected file\n", 'yellow');
        }
      }
    }
    
  } catch (Exception $e) {
    echo color("  ❌ ERROR: " . $e->getMessage() . "\n", 'red');
    $stats['failed']++;
  }
  
  echo "\n";
}

// Print summary
echo color("=" . str_repeat("=", 47) . "\n", 'cyan');
echo color("Results: ", 'bold');
echo color("{$stats['passed']} passed", 'green') . ", ";
echo color("{$stats['failed']} failed", 'red') . ", ";
if ($stats['created'] > 0) {
  echo color("{$stats['created']} created", 'blue') . ", ";
}
if ($stats['skipped'] > 0) {
  echo color("{$stats['skipped']} skipped", 'yellow');
}
echo "\n\n";

// Exit code
exit($stats['failed'] > 0 ? 1 : 0);

/**
 * Load environment variables from .env file
 */
function loadEnv($envFile) {
  if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
      if (strpos(trim($line), '#') === 0) continue;
      if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
      }
    }
  }
}

/**
 * Call the parse-verse API endpoint using shared logic
 */
function callParseAPI($apiKey, $text) {
  // Call shared parsing functions (same as parse-verse.php uses)
  $parsed = callAnthropicAPI($apiKey, $text);
  
  // Check if AI returned an error object - return it as-is
  if (isset($parsed['error'])) {
    return $parsed;
  }
  
  $result = processAIResponse($parsed, $text);
  
  return $result;
}

/**
 * Compare expected vs actual results
 * Returns array of differences (empty if identical)
 */
function compareResults($expected, $actual) {
  $differences = [];
  
  // Check if either is an error response
  $expectedIsError = isset($expected['error']);
  $actualIsError = isset($actual['error']);
  
  // If error status differs, that's a difference
  if ($expectedIsError !== $actualIsError) {
    if ($expectedIsError) {
      $differences['error'] = [
        'expected' => $expected['error'],
        'actual' => '(not an error response)',
      ];
    } else {
      $differences['error'] = [
        'expected' => '(not an error response)',
        'actual' => $actual['error'],
      ];
    }
    return $differences;
  }
  
  // If both are error responses, compare error messages
  if ($expectedIsError && $actualIsError) {
    if ($expected['error'] !== $actual['error']) {
      $differences['error'] = [
        'expected' => $expected['error'],
        'actual' => $actual['error'],
      ];
    }
    return $differences;
  }
  
  // Compare normal response fields
  $fields = ['reference', 'refSort', 'content', 'translation'];
  
  foreach ($fields as $field) {
    $exp = $expected[$field] ?? null;
    $act = $actual[$field] ?? null;
    
    // Convert empty strings to null for comparison
    if ($exp === '') $exp = null;
    if ($act === '') $act = null;
    
    // Strict comparison
    if ($exp !== $act) {
      $differences[$field] = [
        'expected' => $exp,
        'actual' => $act,
      ];
    }
  }
  
  return $differences;
}
