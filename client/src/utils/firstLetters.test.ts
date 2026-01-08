/**
 * Tests for first letters utility functions
 * Run with: npm run build && node dist/utils/firstLetters.test.js
 * Or use tsx: npx tsx client/src/utils/firstLetters.test.ts
 */

import { getFirstLettersChunks } from './firstLetters'

interface TestCase {
  name: string
  input: string
  expected: string
  expectedChunks: number
}

/**
 * Helper function to escape newlines for console.log display
 * Converts actual newline characters to escaped newlines for readability
 */
function escapeNewlines(str: string): string {
  return str.replace(/\n/g, '\\n')
}

// Test cases
const tests: TestCase[] = [
  {
    name: "Test 1 (basic)",
    input: "3 Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.\n4 Trust ye in the LORD for ever: for in the LORD JEHOVAH is everlasting strength:",
    expected: "3 Twkhipp, wmisot: bhtit.\n4 TyitLfe: fitLJies:",
    expectedChunks: 6,
  },
  {
    name: "Test 2 (apostrophe)",
    input: "God's Son who loves us; yes, truly!",
    expected: "GSwlu; y, t!",
    expectedChunks: 3,
  },
  {
    name: "Test 3 (basic)",
    input: "26 My soul waiteth for the Lord",
    expected: "26 MswftL",
    expectedChunks: 2,
  },
  {
    name: "Test 4 (Spanish accented letters)",
    input: "Jesús dijo: a el árbol",
    expected: "Jd: aeá",
    expectedChunks: 2,
  },
  {
    name: "Test 5 (German umlauts)",
    input: "Für Gott ist nichts unmöglich",
    expected: "FGinu",
    expectedChunks: 1,
  },
  {
    name: "Test 6 (Hyphenated words)",
    input: "God's grace is self-control, and long-suffering",
    expected: "Ggisc, als",
    expectedChunks: 2,
  },
  {
    name: "Test 7 (Multiple hyphens)",
    input: "well-known all-powerful, self-control",
    expected: "wkap, sc",
    expectedChunks: 2,
  },
  {
    name: "Test 8 (parenthetical em-dash should start new chunk)",
    input: "Love is patient—love is kind",
    expected: "Lip—lik",
    expectedChunks: 2,
  },
  {
    name: "Test 9 (parenthetical space-minus-space should start new chunk)",
    input: "Love is patient - love is kind",
    expected: "Lip - lik",
    expectedChunks: 2,
  },
]

console.log("Testing First Letters Utility\n" + "=".repeat(50))

let passCount = 0
let failCount = 0

tests.forEach(test => {
  const chunks = getFirstLettersChunks(test.input)
  
  const actualChunkCount = chunks.length
  const actualFirstLetters = chunks.map(c => c.firstLetters + c.separators).join('')

  const passedResult: boolean = test.expected === actualFirstLetters
  const passedChunks: boolean = test.expectedChunks === actualChunkCount
  const passed: boolean = passedResult && passedChunks

  console.log(`\n${passed ? '✅' : '❌'} ${test.name}`)
  console.log(`   Input: "${escapeNewlines(test.input)}"`)
  if (passedResult) {
    console.log(`   Result (✅): "${escapeNewlines(test.expected || '')}"`)
  } else {
    console.log(`   Result expected: "${escapeNewlines(test.expected || '')}"`)
    console.log(`   Result got:      "${escapeNewlines(actualFirstLetters)}" (❌)`)
  }
  if (passedChunks) {
    console.log(`   Chunks (✅): ${actualChunkCount}`)
  } else {
    console.log(`   Chunks expected: ${test.expectedChunks}`)
    console.log(`   Chunks got:      ${actualChunkCount} (❌)`)
  }
  if (!passed) {
    console.log(`   Chunks:`, chunks.map(c => ({ fullText: c.fullText, firstLetters: c.firstLetters, separators: escapeNewlines(c.separators) })))
  }

  if (passed) passCount++
  else failCount++
})

console.log("\n" + "=".repeat(50))
console.log(`Results: ${passCount} passed, ${failCount} failed`)
console.log("Testing complete!")

// Exit with error code if any tests failed
if (failCount > 0) {
  process.exit(1)
}
