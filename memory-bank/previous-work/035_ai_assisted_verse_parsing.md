# AI-Assisted Verse Parsing (Partial Implementation)

**Date:** January 10, 2026  
**Status:** Frontend Complete, AI Integration Pending  
**Goal:** Simplify verse entry with AI-powered parsing

## Overview

Implemented a two-step wizard for adding verses that uses AI to parse pasted verse text into structured fields. Currently functional with placeholder backend - ready for Anthropic AI integration.

## Problem Solved

**Old Flow:** Users had to manually fill 6+ fields (reference, refSort, content, translation, tags, date)
- Error-prone (typos in reference or refSort)
- Tedious for bulk entry
- Required understanding of refSort format

**New Flow:** Users paste verse text → AI parses it → Review & submit
- One paste action instead of 6 fields
- AI handles formatting cleanup (cross-references, etc.)
- AI infers reference and version info
- User can still edit before submission

## Implementation

### Architecture Pattern: Two-Step Wizard

**Step 1: Paste & Parse**
- Large textarea for pasting verse text
- "Smart Fill ✨" button triggers AI parsing
- "Skip AI" button bypasses AI (manual entry)
- Loading state during API call
- Error state with retry/manual options

**Step 2: Review & Submit**
- Pre-filled form with parsed data
- All fields editable
- "← Back" button returns to Step 1
- Submit adds verse as normal

### Key Decisions Made

**Button Naming:**
- Primary: "Smart Fill ✨" (conveys AI without being technical)
- Secondary: "Skip AI" (honest about what you're skipping)
- Rejected: "Parse", "Auto-Fill", "Continue"

**Loading UX:**
- Spinner + "✨ Parsing your verse..." message
- 15-second timeout (AI calls can be slow)
- Buttons disabled during loading
- No fake progress bars (AI speed varies)

**Error Handling:**
- Show clear error message
- "Retry" button (network might recover)
- "Enter Manually" button (no dead ends)
- Errors logged to console for debugging

**Placeholder Text:**
```
Paste your verse here...
(We'll use AI to infer reference/version info, 
and to cleanup any cross-references / formatting.)
```
- Emphasizes AI capability
- Sets expectations about what AI does
- Mentions cross-reference cleanup (common pain point)

### Files Created

**Backend:**
- `server/api/parse-verse.php` - API endpoint (placeholder)
  - Accepts `{ text: string }`
  - Returns `{ reference, refSort, content, translation, tags }`
  - Currently returns text as-is in content, blanks for others
  - Requires authentication
  - TODO: Replace with Anthropic API call

**Frontend:**
- `client/src/composables/useVerses.ts` - Added wizard logic
  - `addVerseStep` state ('paste' | 'form')
  - `pastedText` reactive state
  - `parsingState` ('idle' | 'loading' | 'error' | 'success')
  - `parseVerseWithAI()` function
  - `skipAIParsing()` function
  - `goBackToPaste()` function

### Files Modified

**Routing:**
- `server/public/index.php` - Added route for `/api/parse-verse`
  - Bug fix: Routes must be registered in hardcoded array

**State Management:**
- `client/src/app.ts` - Exposed wizard state to template
  - Added wizard state/methods to return object
  - Added watch to reset wizard on tab switch

**UI:**
- `client/src/App.vue` - Two-step wizard UI
  - Step 1: Paste textarea + buttons + loading/error states
  - Step 2: Back button + existing form
  - Enter key triggers parsing
  - Mobile-responsive design

## Technical Details

### API Flow

```
User pastes text
    ↓
Click "Smart Fill ✨"
    ↓
POST /api/parse-verse { text: "John 3:16\nFor God so loved..." }
    ↓
[Backend placeholder returns content as-is]
    ↓
Frontend pre-fills form with response
    ↓
User reviews/edits fields
    ↓
Submit verse (existing flow)
```

### State Machine

```
State: 'paste'
- Show textarea + Smart Fill/Skip AI buttons
- On Smart Fill click → state = 'loading'
- On Skip AI click → pre-fill content, state = 'form'

State: 'loading'
- Show spinner + message
- Buttons disabled
- On success → pre-fill form, state = 'form'
- On error → state = 'error'

State: 'error'
- Show error message
- On Retry → state = 'loading'
- On Enter Manually → pre-fill content, state = 'form'

State: 'form'
- Show form with pre-filled data
- On Back → state = 'paste'
- On Submit → add verse (existing flow)
```

### Timeout Handling

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);

const response = await fetch('/api/parse-verse', {
  signal: controller.signal,
  // ... other options
});

clearTimeout(timeoutId);
```

**Why 15 seconds:** AI calls can be slow, but longer = poor UX

### Authentication Check

```typescript
// Get auth token from IndexedDB
const authStore = await import('../db').then(m => m.db.auth.toArray());
const token = authStore[0]?.token;

if (!token) {
  throw new Error('Authentication required');
}
```

**Why require auth:** Prevents abuse of AI API (costs money)

## What's Left to Implement

### AI Integration (Anthropic)

**Backend Changes Needed:**
1. Install Anthropic SDK or use curl
2. Configure API key (environment variable)
3. Replace placeholder in `parse-verse.php`:

```php
// TODO: Replace this placeholder
$response = [
  'reference' => '',
  'refSort' => '',
  'content' => $text,
  'translation' => '',
  'tags' => []
];

// With actual AI parsing:
$parsed = parseWithAI($text);
$response = [
  'reference' => $parsed['reference'],
  'refSort' => generateRefSort($parsed['reference']),
  'content' => $parsed['content'],
  'translation' => $parsed['translation'],
  'tags' => $parsed['tags']
];
```

**AI Prompt Engineering:**
- Extract reference (e.g., "John 3:16")
- Extract translation/version (e.g., "NIV", "ESV")
- Clean content (remove cross-references, formatting)
- Extract any tags from context
- Return structured JSON

**Reference Sort Generation:**
- Parse book name → number (01-66)
- Parse chapter → 3-digit (001-999)
- Parse verse → 3-digit (001-999)
- Format: `bible.BBCCCVVV`
- Handle multi-verse ranges

### Future Enhancements

**Smart Defaults:**
- Remember last translation used
- Auto-set started date to today
- Suggest tags based on content

**Batch Parsing:**
- Accept multiple verses at once
- Parse each separately
- Add all with one click

**Validation:**
- Check if verse already exists
- Warn about duplicate entries
- Offer to skip or update

**Feedback Loop:**
- Allow users to correct AI mistakes
- Track corrections to improve prompts
- Show confidence scores

## Testing Checklist

### Current State (Placeholder)
- [x] UI shows Step 1 (paste textarea)
- [x] Smart Fill button triggers API call
- [x] Loading spinner shows during call
- [x] Error state shows if API fails
- [x] Skip AI copies text to content field
- [x] Step 2 shows pre-filled form
- [x] Back button returns to Step 1
- [x] Form submission works
- [x] Wizard resets on tab switch
- [x] Enter key triggers parsing
- [x] Mobile responsive

### Post-AI Integration
- [ ] Reference extracted correctly
- [ ] RefSort generated correctly
- [ ] Translation detected
- [ ] Cross-references removed
- [ ] Content cleaned properly
- [ ] Edge cases handled (ranges, multiple verses, etc.)
- [ ] Performance acceptable (<3 seconds)
- [ ] Error messages helpful
- [ ] Cost per parse reasonable

## UX Improvements vs Manual Entry

**Speed:** 1 paste + 1 click vs 6 field entries  
**Accuracy:** AI reduces typos in reference/refSort  
**Learning Curve:** Lower (paste is universal)  
**Flexibility:** Can still use manual entry (Skip AI)  

## Lessons Learned

**1. Route Registration Matters**
- PHP router needs explicit route registration
- Easy to forget when adding new endpoints
- Error was cryptic ("404 Not Found")

**2. Placeholder Pattern Works Well**
- Implement UI first with placeholder backend
- Test full flow before AI integration
- Reduces scope/complexity during development

**3. User-Friendly Naming is Hard**
- "Parse" too technical
- "Smart Fill" strikes good balance
- Emoji adds personality without being childish

**4. Error States Are Critical**
- Network failures common with AI APIs
- Always provide retry + fallback options
- Never leave user in dead end state

## Future Considerations

**When to Remove Skip AI?**
- Once AI is 95%+ accurate
- User testing shows high satisfaction
- Cost per parse is reasonable
- Keep for power users who prefer manual?

**Rate Limiting:**
- Prevent abuse of AI API
- Track usage per user
- Set daily limits
- Implement client-side throttling

**Caching:**
- Cache common verses (John 3:16, etc.)
- Reduce API costs
- Faster response times
- Privacy considerations (don't cache personal notes)

## Related Files

**Core Implementation:**
- `server/api/parse-verse.php` - Backend endpoint
- `client/src/composables/useVerses.ts` - Wizard logic
- `client/src/App.vue` - UI components

**Supporting:**
- `server/public/index.php` - Route registration
- `client/src/app.ts` - State exposure

**Documentation:**
- This file
- `memory-bank/activeContext.md` - Next steps
