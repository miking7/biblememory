<?php
/**
 * Shared verse parsing logic for API and tests
 */

/**
 * Call Anthropic API to parse Bible verse text
 * 
 * @param string $apiKey Anthropic API key
 * @param string $text Pasted verse text
 * @return array Parsed verse data
 * @throws Exception on API errors
 */
function callAnthropicAPI($apiKey, $text) {
  // System prompt with 66 books mapping for accuracy
  $systemPrompt = <<<'PROMPT'
You are a Bible verse parser. Your job is to extract structured information from pasted Bible verse text.

BOOK NUMBER MAPPING (use these exact numbers):
Genesis=01, Exodus=02, Leviticus=03, Numbers=04, Deuteronomy=05, Joshua=06, Judges=07, Ruth=08,
1 Samuel=09, 2 Samuel=10, 1 Kings=11, 2 Kings=12, 1 Chronicles=13, 2 Chronicles=14, Ezra=15, Nehemiah=16, Esther=17,
Job=18, Psalms=19, Proverbs=20, Ecclesiastes=21, Song of Solomon=22, Isaiah=23, Jeremiah=24, Lamentations=25,
Ezekiel=26, Daniel=27, Hosea=28, Joel=29, Amos=30, Obadiah=31, Jonah=32, Micah=33, Nahum=34, Habakkuk=35,
Zephaniah=36, Haggai=37, Zechariah=38, Malachi=39,
Matthew=40, Mark=41, Luke=42, John=43, Acts=44, Romans=45, 1 Corinthians=46, 2 Corinthians=47, Galatians=48,
Ephesians=49, Philippians=50, Colossians=51, 1 Thessalonians=52, 2 Thessalonians=53, 1 Timothy=54, 2 Timothy=55,
Titus=56, Philemon=57, Hebrews=58, James=59, 1 Peter=60, 2 Peter=61, 1 John=62, 2 John=63, 3 John=64, Jude=65, Revelation=66

CRITICAL RULES:
1. Extract reference if present (e.g., "John 3:16", "Romans 8:28-29", "1 Cor 13:1-4")
2. For multi-verse passages, use range format (e.g., "1 Cor 13:1-4", "Psalm 23:1-3")
3. If no reference found, return null for reference and refSort
4. Remove ALL footnote markers ([a], [b], *, †, superscripts, etc.) and footnote sections
5. Remove cross-reference information
6. Keep verse numbers at the start of each verse
7. Combine ALL verses into a content field comprising an array of verse strings
8. Detect version/translation if present (NIV, ESV, KJV, NKJV, NLT, NASB, CSB, etc.)
9. If no version detected, return null for translation

SPECIAL NOTES:
1. The input from some online bibles include the chapter number in front of verse #1 instead of "1" - ie: for Psalms 23:1-2 the text for the verses might be "23 The Lord is my shepherd... 2 Second verse content... 3 Third verse content... etc.".  Please keep this in mind when trying to understand the content.  The "23 The Lord..." should be interpreted as chapter 23, verse 1, and result in the output content correctly using verse number 1 instead - ie: "1 The Lord is my shepherd... 2 Second verse content... 3 Third verse content... etc.".

REFSORT FORMAT:
Generate refSort in format: bible.BBCCCVVV
- BB = 2-digit book number (from mapping above)
- CCC = 3-digit chapter (001-999)
- VVV = 3-digit verse (001-999)
- For ranges (e.g., "23:1-3"), use the FIRST verse number
- Example: "John 3:16" → "bible.43003016" (John=43, chapter=003, verse=016)
- Example: "Psalm 23:1-3" → "bible.19023001" (Psalms=19, chapter=023, verse=001)
- Example: "1 Cor 13:1-4" → "bible.46013001" (1 Corinthians=46, chapter=013, verse=001)

Return EXACTLY ONE JSON object (NOT an array of objects):
{
  "reference": "Book Chapter:Verse-Verse" or null,
  "refSort": "bible.BBCCCVVV" or null,
  "content": ["5 first verse text", "6 next verse text", "7 next verse text"],
  "translation": "VERSION" or null
}

CRITICAL: 
- Return ONE object, NOT an array of objects
- ALL verses go in a SINGLE content field
- For multi-verse passages, each verse is a separate string in the content array, with each verse preceeded by its verse number
- For single-verse passages, the content array will be an array with a single string, WITHOUT a verse number prefix

Examples:
- "John 3:16 (NIV) 16 For God so loved..." → {"reference": "John 3:16", "refSort": "bible.43003016", "content": ["For God so loved..."], "translation": "NIV"}
- "Romans 8:28-29 ESV 28 And we... 29 For those..." → {"reference": "Romans 8:28-29", "refSort": "bible.45008028", "content": ["28 And we know that in all things God works...", "29 For those God foreknew he also predestined..."], "translation": "ESV"}
- "16 For God so loved..." → {"reference": null, "refSort": null, "content": ["16 For God so loved..."], "translation": null}
PROMPT;

  // Prepare API request
  $requestData = [
    'model' => 'claude-haiku-4-5-20251001',
    'max_tokens' => 10000,
    'system' => $systemPrompt,
    'messages' => [
      [
        'role' => 'user',
        'content' => "Parse this Bible verse text:\n\n" . $text
      ]
    ]
  ];

  // Make API call using cURL
  $ch = curl_init('https://api.anthropic.com/v1/messages');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($requestData),
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . $apiKey,
      'anthropic-version: 2023-06-01'
    ],
    CURLOPT_TIMEOUT => 30
  ]);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  // Handle cURL errors
  if ($curlError) {
    throw new Exception('Network error: ' . $curlError);
  }

  // Handle HTTP errors
  if ($httpCode !== 200) {
    $errorData = json_decode($response, true);
    $errorMsg = $errorData['error']['message'] ?? "HTTP $httpCode";
    
    if ($httpCode === 401) {
      throw new Exception('Invalid API key');
    } elseif ($httpCode === 429) {
      throw new Exception('Rate limit exceeded');
    }
    
    throw new Exception('API error: ' . $errorMsg);
  }

  // Parse response
  $data = json_decode($response, true);
  if (!$data || !isset($data['content'][0]['text'])) {
    throw new Exception('Invalid API response structure');
  }

  $content = trim($data['content'][0]['text']);
  
  // Remove markdown code blocks if present
  $content = preg_replace('/```json\n?/', '', $content);
  $content = preg_replace('/```\n?/', '', $content);
  $content = trim($content);
  
  // Extract JSON from response
  if (preg_match('/\{[\s\S]*\}/', $content, $matches)) {
    $parsed = json_decode($matches[0], true);
    
    if (!$parsed) {
      throw new Exception('Failed to parse JSON from AI response');
    }
    
    // Validate structure
    if (!array_key_exists('reference', $parsed) ||
        !array_key_exists('refSort', $parsed) ||
        !array_key_exists('content', $parsed) ||
        !array_key_exists('translation', $parsed)) {
      throw new Exception('AI response missing required fields');
    }
    
    return $parsed;
  }
  
  throw new Exception('No valid JSON found in AI response');
}

/**
 * Process parsed AI response into final format
 * (same processing as parse-verse.php)
 */
function processAIResponse($parsed, $originalText) {
  // Validate refSort format if present
  $refSort = $parsed['refSort'] ?? '';
  if ($refSort && !preg_match('/^bible\.\d{8}$/', $refSort)) {
    error_log('Invalid refSort format from AI: ' . $refSort);
    $refSort = '';
  }
  
  // Convert content array to newline-delimited string
  $content = $parsed['content'] ?? $originalText;
  if (is_array($content)) {
    $content = implode("\n", $content);
  }
  
  return [
    'reference' => $parsed['reference'] ?? '',
    'refSort' => $refSort,
    'content' => $content,
    'translation' => $parsed['translation'] ?? '',
  ];
}
