# 057 - Messaging Repositioning: Lead with Digital Flashcards

## Summary

Repositioned all public-facing messaging to lead with "digital flashcards" as the familiar concept, with "spaced repetition" as the science powering it. Also updated CTA button text from "Get Started Free" to "Start Memorizing" to avoid freemium connotations.

## Rationale

- **Flash cards** are universally familiar from school days - immediate mental model, no explanation needed
- **Spaced repetition** is technical jargon that many users don't immediately understand
- Leading with familiar concept makes the app more approachable while keeping scientific credibility
- "Get Started Free" implies paid tiers exist; "Start Memorizing" is action-focused and neutral

## New Messaging Formula

**"Digital flashcards with spaced repetition"**

## Files Updated

### SEO & Meta Tags
- `client/index.html` - Title, meta description, keywords, Open Graph, Twitter cards, JSON-LD

### Public-Facing Content
- `README.md` - Tagline, overview paragraph, feature bullets
- `client/src/LandingPage.vue` - Hero subtitle, "Smart Flashcards" feature card, CTA buttons
- `client/public/features.html` - "Smart Flashcards" section header, CTA button
- `client/public/about.html` - Origin story wording

## Key Changes

| Location | Before | After |
|----------|--------|-------|
| Page title | "Memorize Scripture with Spaced Repetition" | "Digital Flashcards with Spaced Repetition" |
| Hero subtitle | "...with proven spaced repetition..." | "Digital flashcards with spaced repetition..." |
| Feature card | "Proven Method" | "Smart Flashcards" |
| CTA buttons | "Get Started Free" | "Start Memorizing" |
| Keywords | (none) | Added "bible flashcards", "scripture flashcards", "digital flashcards" |

## Design Decisions

1. **One word "flashcards"** - Used consistently throughout (not "flash cards")
2. **README keeps tech focus** - For developer audience, still leads with "modern, offline-first PWA"
3. **Spaced repetition still mentioned** - Always paired with flashcards, positioned as "the science behind it"
4. **"Smart Flashcards"** - Feature section name that bridges familiar + enhanced
