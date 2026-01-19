# Landing Page Implementation Specification

**Project:** Bible Memory App Landing Page & Marketing Pages
**Date Created:** 2026-01-19
**Status:** Planning → Implementation
**Domain:** https://bible-memory.app

---

## 📋 Overview

### Goal
Transform Bible Memory from a "dive right in" app experience to a professional landing page that markets the app to first-time visitors, while maintaining full app functionality for authenticated users.

### Architecture Approach
**Simplified hybrid architecture** - no Vue Router needed:
- **Unauthenticated users:** See Vue-based landing page at `/`
- **Authenticated users:** See full app at `/`
- **Additional pages:** Static HTML files (features.html, about.html, privacy.html, terms.html)
- **Auth flow:** Modal-based (existing pattern)

### Key Principles
1. **SEO-friendly:** index.html contains all meta tags, static pages are pure HTML
2. **Simple:** Conditional rendering in App.vue, no router complexity
3. **Progressive:** Launch with landing page, add static pages as needed
4. **Maintainable:** Header duplication acceptable for handful of static pages

---

## 🏗️ Architecture

### File Structure
```
client/
├── index.html                    # Entry point with SEO meta tags
├── features.html                 # Static page (Phase 2)
├── about.html                    # Static page (Phase 2)
├── privacy.html                  # Static page (Phase 2)
├── terms.html                    # Static page (Phase 2)
├── public/
│   ├── shared-styles.css        # Styles for static pages
│   ├── og-image.png             # Social sharing image (1200x630)
│   └── icons/                   # Existing PWA icons
└── src/
    ├── App.vue                  # Modified: conditional rendering
    ├── LandingPage.vue          # NEW: Landing page component
    ├── components/
    │   └── LandingNav.vue       # NEW: Landing page navigation
    └── ...                      # Existing app files
```

### Conditional Rendering Logic (App.vue)
```vue
<template>
  <div>
    <!-- Landing Page (unauthenticated only) -->
    <LandingPage v-if="!isAuthenticated" />

    <!-- Main App (authenticated only) -->
    <div v-else>
      <!-- Existing app: banner, header, stats, tabs, modals -->
    </div>
  </div>
</template>
```

### Navigation Flow
```
User visits / (not authenticated)
  ↓
Show LandingPage.vue
  ↓
Clicks "Sign Up" → Auth Modal → Account Created
  ↓
App.vue re-renders → Shows main app (existing functionality)

User visits / (authenticated)
  ↓
Show main app immediately (skip landing page)
```

---

## 📅 Implementation Phases

### **Phase 1: Core Landing Page** (Priority: High)
**Goal:** Single-page landing experience for unauthenticated users

**Components to Create:**
- [ ] `LandingPage.vue` - Main landing page component
- [ ] `LandingNav.vue` - Navigation header with CTA buttons

**Modifications:**
- [ ] Update `App.vue` - Add conditional rendering
- [ ] Update `index.html` - Add comprehensive SEO meta tags
- [ ] Update server config (if needed) - Ensure fallback works

**Content Sections:**
1. Navigation header
2. Hero section
3. Features grid (4-6 features)
4. How it works (3 steps)
5. PWA installation callout
6. Final CTA section
7. Footer with links

**Testing:**
- [ ] Visit while not authenticated → see landing page
- [ ] Click "Sign Up" → modal opens
- [ ] Create account → redirects to app
- [ ] Refresh while authenticated → see app (no landing page)
- [ ] Sign out → see landing page again
- [ ] Mobile responsive testing
- [ ] Lighthouse SEO audit (target: 90+)

---

### **Phase 2: Static Pages** (Priority: Medium)
**Goal:** Additional marketing/legal pages as static HTML

**Files to Create:**
- [ ] `features.html` - Detailed feature breakdown
- [ ] `about.html` - Project story and mission
- [ ] `privacy.html` - Privacy policy
- [ ] `terms.html` - Terms of service

**Shared Resources:**
- [ ] `public/shared-styles.css` - Glass-morphism styles for static pages
- [ ] Header template (reusable structure to copy/paste)
- [ ] Footer template (reusable structure to copy/paste)

**Testing:**
- [ ] All static pages load correctly
- [ ] Links between pages work
- [ ] Back to main site (/) works
- [ ] Styles match landing page aesthetic
- [ ] Mobile responsive
- [ ] No console errors

---

### **Phase 3: SEO & Polish** (Priority: Low - Can launch without)
**Goal:** Optimize for search engines and polish details

**SEO Assets:**
- [ ] Create `og-image.png` (1200x630) for social sharing
- [ ] Generate `sitemap.xml`
- [ ] Create `robots.txt`
- [ ] Add JSON-LD structured data to index.html

**Polish:**
- [ ] Optimize images (WebP format)
- [ ] Add fade-in animations to landing page sections
- [ ] Test all external links (GitHub, BibleGateway references)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Performance audit (Lighthouse, target: 90+ across all metrics)

---

## 📝 Content & Copy

### Landing Page (LandingPage.vue)

#### **1. Navigation Header**
```
Logo: [App Icon] Bible Memory
Links: Features (→ /features.html) | About (→ /about.html)
CTA Buttons: Sign In | Sign Up (primary button)
```

#### **2. Hero Section**
**Headline:**
> Hide God's Word in Your Heart

**Subheading:**
> Memorize Scripture effectively with proven spaced repetition, beautiful design, and offline-first access. Free and open source.

**CTA Buttons:**
- Primary: "Get Started Free" → Opens signup modal
- Secondary: "Sign In" → Opens login modal

**Visual:**
- Hero background: Subtle gradient (matches app aesthetic)
- Optional: Mockup image of app on phone (screenshot of Review tab in action)

---

#### **3. Features Grid** (4-6 cards)

**Feature 1: Offline First**
- Icon: 📱 (or Material Design Icon: mdi-cloud-off-outline)
- Title: "Works Everywhere"
- Description: "Memorize verses anywhere, anytime. No internet required. Your verses sync automatically when you're back online."

**Feature 2: Spaced Repetition**
- Icon: 🧠 (or mdi-brain)
- Title: "Proven Method"
- Description: "Built on spaced repetition science. Review verses at optimal intervals (8 days → 56 days → 112 days) for long-term retention."

**Feature 3: Multiple Review Modes**
- Icon: 🎯 (or mdi-target)
- Title: "Flexible Practice"
- Description: "Review your way: Flash Cards, Progressive Hints, First Letters, Type It mode, or full reveal. Adjust difficulty on the fly."

**Feature 4: Beautiful Design**
- Icon: 🎨 (or mdi-palette-outline)
- Title: "Distraction-Free Focus"
- Description: "Clean, modern interface with glass-morphism design. Immersive mode removes all distractions for deep focus."

**Feature 5: Multi-Device Sync**
- Icon: ☁️ (or mdi-sync)
- Title: "Seamless Sync"
- Description: "Start on your phone, continue on your tablet or computer. Your progress stays in sync across all devices."

**Feature 6: Install as App**
- Icon: 📲 (or mdi-cellphone-arrow-down)
- Title: "Native-Like Experience"
- Description: "Install directly to your home screen. Works like a native app with offline access and fast performance."

---

#### **4. How It Works** (3 steps with numbers)

**Step 1: Add Your Verses**
> Paste any verse and let AI extract the reference and clean the text. Or enter manually with full control.

Visual suggestion: Screenshot of "Add Verse" tab with Smart Fill button

**Step 2: Review Daily**
> Follow your personalized review schedule. Mark "Got it!" when you remember, or "Again" if you need more practice.

Visual suggestion: Screenshot of Review tab showing a verse with mode buttons

**Step 3: Build Your Streak**
> Track your progress with daily stats. Watch your streak grow as you build the habit of hiding Scripture in your heart.

Visual suggestion: Screenshot of stats bar showing Total Verses, Reviewed Today, Day Streak

---

#### **5. PWA Installation Callout**

**Headline:**
> Install on Your Phone

**Description:**
> Bible Memory works best as an installed app. Add it to your home screen for quick access and offline use.

**Instructions (collapsed/expandable):**

**iOS (iPhone/iPad):**
1. Open in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**Android:**
1. Open in Chrome
2. Tap the three-dot menu
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install"

Visual suggestion: Icon badges showing iOS/Android compatibility

---

#### **6. Optional: Social Proof Section**

**Headline:**
> Open Source & Free Forever

**Description:**
> Built with transparency. No ads, no tracking, no premium tiers. Star us on GitHub or contribute to the project.

**Stats/Badges:**
- GitHub stars count (if available)
- "100% Free" badge
- "Open Source" badge
- "Offline First" badge

**GitHub Link:**
> [View on GitHub →] (→ https://github.com/miking7/biblememory)

---

#### **7. Final CTA Section**

**Headline:**
> Start Memorizing Today

**Subheading:**
> Join others hiding God's Word in their hearts.

**CTA Button:**
> Get Started Free (→ Opens signup modal)

---

#### **8. Footer**

**Links:**
- Features (→ /features.html)
- About (→ /about.html)
- Privacy Policy (→ /privacy.html)
- Terms of Service (→ /terms.html)
- GitHub (→ https://github.com/miking7/biblememory)

**Copyright:**
> © 2026 Bible Memory. Open source under [LICENSE].

---

### Features Page (features.html)

**Purpose:** Detailed breakdown of each feature with screenshots/examples

**Content Outline:**
1. Page header: "Features - Bible Memory"
2. Introduction paragraph
3. Detailed sections for each feature (expand on landing page feature cards):
   - Offline-First Architecture (explain IndexedDB, sync algorithm)
   - Spaced Repetition System (explain 8→56→112 day schedule, categories)
   - Review Modes (screenshots of each mode with explanations)
   - Statistics & Streak Tracking
   - Multi-Device Sync (explain OpLog pattern)
   - PWA Benefits (offline, installable, fast)
   - AI-Powered Verse Parsing (explain Smart Fill feature)
4. Footer (same as landing page)

**Draft Copy:** (To be created during Phase 2 implementation)

---

### About Page (about.html)

**Purpose:** Project story, mission, and open source information

**Content Outline:**
1. Page header: "About - Bible Memory"
2. **Mission Statement:**
   > Bible Memory exists to help believers hide God's Word in their hearts through effective, accessible, and beautiful memorization tools.
3. **Why This Project Exists:**
   - Personal story (if desired)
   - Gap in existing tools
   - Benefits of scripture memorization
4. **Open Source Commitment:**
   - Why open source matters
   - How to contribute
   - GitHub link
5. **Technology:**
   - Built with Vue 3, TypeScript, Vite
   - Offline-first with IndexedDB
   - Progressive Web App
6. **Contact/Feedback:**
   - GitHub issues for feedback
   - Link to repository
7. Footer (same as landing page)

**Draft Copy:** (To be created during Phase 2 implementation)

---

### Privacy Policy (privacy.html)

**Purpose:** Legal compliance, transparency about data collection

**Content Outline:**
1. Page header: "Privacy Policy - Bible Memory"
2. **Last Updated:** [Date]
3. **Information We Collect:**
   - Email address (for authentication)
   - Verses you add (content, reference, tags, dates)
   - Review history (dates, success/practice marks)
   - Device information (for sync)
4. **How We Use Your Information:**
   - Provide the service (sync, authentication)
   - Improve the app
   - We do NOT sell data
   - We do NOT share data with third parties
   - We do NOT use analytics/tracking (unless added in Phase 3)
5. **Data Storage:**
   - Local-first (IndexedDB in your browser)
   - Server backup for sync (encrypted)
   - Data retention policy
6. **Your Rights:**
   - Access your data (export feature)
   - Delete your account
   - Control your data
7. **Security:**
   - Password hashing
   - Secure transmission (HTTPS)
8. **Changes to Privacy Policy:**
   - How users will be notified
9. **Contact:**
   - GitHub issues or repository email

**Note:** Consider using a privacy policy generator and customizing it.

**Draft Copy:** (To be created during Phase 2 implementation)

---

### Terms of Service (terms.html)

**Purpose:** Legal protection, usage terms

**Content Outline:**
1. Page header: "Terms of Service - Bible Memory"
2. **Last Updated:** [Date]
3. **Acceptance of Terms:**
   - By using service, you agree to terms
4. **Description of Service:**
   - Scripture memorization app
   - Provided "as is"
5. **User Accounts:**
   - Responsibility for account security
   - Minimum age requirement (13+ or per COPPA)
6. **User Content:**
   - Users own their verses/data
   - Users responsible for content they add
7. **Prohibited Uses:**
   - No spam, abuse, illegal activity
   - No circumventing security
8. **Disclaimer of Warranties:**
   - No warranty, use at own risk
   - Not responsible for data loss (users should backup)
9. **Limitation of Liability:**
   - Not liable for damages
10. **Changes to Terms:**
    - Right to modify terms
    - How users will be notified
11. **Governing Law:**
    - Jurisdiction (your location)
12. **Contact:**
    - GitHub issues or repository email

**Note:** Consider using a terms of service generator and customizing it.

**Draft Copy:** (To be created during Phase 2 implementation)

---

## 🎨 Visual Assets & Design

### Required Images

**1. Open Graph Image** (`og-image.png`)
- **Dimensions:** 1200x630px
- **Purpose:** Social media sharing preview
- **Content Suggestion:**
  - App logo/icon (large)
  - Text: "Bible Memory" (headline)
  - Text: "Hide God's Word in Your Heart" (subheading)
  - Background: Gradient matching app aesthetic
  - Optional: Subtle scripture verse or app screenshot
- **Format:** PNG
- **File Size:** < 1MB

**2. Hero Section Visual** (Optional)
- **Dimensions:** ~800x600px (responsive)
- **Content Suggestion:**
  - Phone mockup showing Review tab
  - Screenshot of review card with verse
  - OR abstract illustration (Bible, heart, brain motif)
- **Format:** WebP with PNG fallback
- **File Size:** < 300KB

**3. App Screenshots** (For "How It Works" section)
- **Screenshot 1:** Add Verse tab (showing Smart Fill)
  - Dimensions: Actual app size, optimized
  - Show paste textarea with example verse

- **Screenshot 2:** Review tab (showing review card)
  - Dimensions: Actual app size, optimized
  - Show verse card with mode buttons

- **Screenshot 3:** Stats bar
  - Dimensions: Actual app size, optimized
  - Show Total Verses, Reviewed Today, Day Streak

- **Format:** WebP with PNG fallback
- **File Size:** < 200KB each
- **Optimization:** Run through TinyPNG or similar

**4. Feature Icons**
- **Source:** Material Design Icons (already used in app)
- **Implementation:** Use `<i class="mdi mdi-icon-name">` tags
- **Fallback:** Emoji (📱 🧠 🎯 🎨 ☁️ 📲)

### Design Guidelines

**Color Palette** (Match existing app):
- **Primary Blue:** `from-blue-600 to-blue-700`
- **Gradient Background:** `from-blue-500 via-indigo-500 to-purple-600`
- **Glass-morphism:** White with backdrop-blur
- **Text:** `text-slate-800` (dark), `text-slate-600` (medium), `text-slate-500` (light)
- **Accents:** Green for success, Amber for practice, Red for errors

**Typography** (Match existing app):
- **Headings:** Bold, gradient text using `gradient-text` class
- **Body:** Clean, readable sans-serif
- **Sizes:** Responsive with `clamp()` or Tailwind responsive classes

**Spacing:**
- **Sections:** Generous whitespace between sections (py-16 to py-24)
- **Cards:** Consistent padding (p-6 to p-8)
- **Responsive:** Mobile-first, adjust for desktop

**Animations:**
- **Scroll-triggered:** Fade in sections as user scrolls (optional)
- **Hover states:** Subtle scale/shadow effects on buttons
- **Transitions:** Smooth (300ms ease)

---

## 🔍 SEO Configuration

### index.html Meta Tags (Complete)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>Bible Memory - Memorize Scripture with Spaced Repetition</title>
  <meta name="title" content="Bible Memory - Memorize Scripture with Spaced Repetition">
  <meta name="description" content="Hide God's Word in your heart. Memorize Scripture effectively with proven spaced repetition, offline-first access, and beautiful design. Free and open source.">
  <meta name="keywords" content="bible memorization, scripture memory, spaced repetition, bible app, offline bible, pwa, progressive web app, free bible app, verse memorization">
  <meta name="author" content="Bible Memory">
  <meta name="robots" content="index, follow">

  <!-- Canonical URL -->
  <link rel="canonical" href="https://bible-memory.app/">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bible-memory.app/">
  <meta property="og:site_name" content="Bible Memory">
  <meta property="og:title" content="Bible Memory - Memorize Scripture with Spaced Repetition">
  <meta property="og:description" content="Hide God's Word in your heart. Memorize Scripture effectively with proven spaced repetition, offline-first access, and beautiful design. Free and open source.">
  <meta property="og:image" content="https://bible-memory.app/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Bible Memory App">
  <meta property="og:locale" content="en_US">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://bible-memory.app/">
  <meta name="twitter:title" content="Bible Memory - Memorize Scripture with Spaced Repetition">
  <meta name="twitter:description" content="Hide God's Word in your heart. Memorize Scripture effectively with proven spaced repetition and offline-first access.">
  <meta name="twitter:image" content="https://bible-memory.app/og-image.png">
  <meta name="twitter:image:alt" content="Bible Memory App">

  <!-- Additional SEO -->
  <meta name="theme-color" content="#3B82F6">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Bible Memory">

  <!-- Favicon (existing) -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">

  <!-- PWA Manifest (existing) -->
  <link rel="manifest" href="/manifest.webmanifest">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### Structured Data (JSON-LD) - Optional for Phase 3

Add before closing `</head>` tag:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Bible Memory",
  "url": "https://bible-memory.app",
  "description": "Memorize Scripture effectively with proven spaced repetition, offline-first access, and beautiful design.",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "Bible Memory"
  }
}
</script>
```

### sitemap.xml (Phase 3)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bible-memory.app/</loc>
    <lastmod>2026-01-19</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bible-memory.app/features.html</loc>
    <lastmod>2026-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bible-memory.app/about.html</loc>
    <lastmod>2026-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://bible-memory.app/privacy.html</loc>
    <lastmod>2026-01-19</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://bible-memory.app/terms.html</loc>
    <lastmod>2026-01-19</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

### robots.txt (Phase 3)

Place in `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://bible-memory.app/sitemap.xml
```

---

## ✅ Testing Checklist

### Phase 1: Landing Page Testing

**Functional Testing:**
- [ ] Landing page displays when not authenticated
- [ ] App displays when authenticated (no landing page)
- [ ] "Sign Up" button opens auth modal
- [ ] "Sign In" button opens auth modal
- [ ] After signup, user sees app (not landing page)
- [ ] After signin, user sees app (not landing page)
- [ ] After signout, user sees landing page
- [ ] Page refresh maintains correct view (landing vs app)
- [ ] All internal links work (Features, About, etc.)
- [ ] External links open in new tab (GitHub)

**Responsive Testing:**
- [ ] Mobile (375px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1280px width)
- [ ] All sections stack properly on mobile
- [ ] Text remains readable at all sizes
- [ ] Buttons are touch-friendly (min 44px height)
- [ ] Images scale properly

**SEO Testing:**
- [ ] View page source → meta tags visible
- [ ] Open Graph Debugger (Facebook) - https://developers.facebook.com/tools/debug/
- [ ] Twitter Card Validator - https://cards-dev.twitter.com/validator
- [ ] Google Rich Results Test - https://search.google.com/test/rich-results
- [ ] Lighthouse SEO score (target: 90+)

**Performance Testing:**
- [ ] Lighthouse Performance score (target: 90+)
- [ ] Lighthouse Accessibility score (target: 90+)
- [ ] Lighthouse Best Practices score (target: 90+)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Total page size < 2MB

**Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

---

### Phase 2: Static Pages Testing

**Per Page (features.html, about.html, privacy.html, terms.html):**
- [ ] Page loads without errors
- [ ] Navigation header displays correctly
- [ ] All internal links work
- [ ] Footer displays correctly
- [ ] Styles match landing page aesthetic
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Images load correctly (if any)
- [ ] External links open in new tab

**Cross-Page Testing:**
- [ ] Can navigate between all static pages
- [ ] Can navigate back to main site (/)
- [ ] Authenticated users can access static pages
- [ ] Unauthenticated users can access static pages

---

### Phase 3: SEO & Polish Testing

**SEO Validation:**
- [ ] sitemap.xml accessible at /sitemap.xml
- [ ] robots.txt accessible at /robots.txt
- [ ] Structured data validation (Google Rich Results Test)
- [ ] All pages have unique meta descriptions
- [ ] All images have alt text
- [ ] Heading hierarchy correct (h1 → h2 → h3)
- [ ] No broken links (use link checker tool)

**Performance Optimization:**
- [ ] All images optimized and using WebP
- [ ] Lazy loading implemented for below-fold images
- [ ] Fonts loaded efficiently
- [ ] Bundle size analyzed (separate chunks for landing vs app)
- [ ] Service worker caching static pages

**Final Polish:**
- [ ] Animations working smoothly
- [ ] No visual glitches during transitions
- [ ] Copy proofread (no typos)
- [ ] All CTAs clearly visible
- [ ] Color contrast meets WCAG AA standards

---

## 🚀 Launch Checklist

Before going live:
- [ ] All Phase 1 tests passing
- [ ] Domain configured correctly (https://bible-memory.app)
- [ ] SSL certificate active (HTTPS)
- [ ] Server redirecting correctly (all routes → index.html)
- [ ] Static files served correctly (features.html, etc.)
- [ ] og-image.png uploaded and accessible
- [ ] Analytics configured (if desired)
- [ ] Privacy policy reviewed and accurate
- [ ] Terms of service reviewed and accurate
- [ ] GitHub repository updated with landing page info
- [ ] README.md updated with landing page details

Post-launch monitoring:
- [ ] Check Google Search Console for crawl errors
- [ ] Monitor Core Web Vitals
- [ ] Track sign-up conversion rate
- [ ] Collect user feedback

---

## 📐 Technical Specifications

### Component API

#### LandingPage.vue Props
```typescript
// No props needed - uses global isAuthenticated state via bibleMemoryApp
```

#### LandingPage.vue Emits
```typescript
// No emits needed - calls openAuthModal() from bibleMemoryApp
```

### Styling Approach

**LandingPage.vue:**
- Use Tailwind classes (consistent with existing app)
- Reuse existing glass-morphism utilities from App.vue
- Match gradient backgrounds from existing design
- Mobile-first responsive classes

**Static Pages (shared-styles.css):**
- Extract compiled Tailwind CSS or create minimal custom CSS
- Include glass-morphism card styles
- Include gradient backgrounds
- Include button styles matching app
- Keep file size minimal (< 50KB)

### Accessibility Requirements

- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all focusable elements
- [ ] Skip to main content link
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Alt text on all images
- [ ] Semantic HTML (header, nav, main, section, footer)
- [ ] Form labels properly associated

---

## 🔄 Future Enhancements (Post-Launch)

Ideas to consider after core implementation:

**Phase 4: Analytics & Optimization**
- [ ] Add privacy-friendly analytics (Plausible or Umami)
- [ ] A/B test headline variations
- [ ] Track conversion funnel (landing → signup → first verse added)
- [ ] Heat mapping (where users click)

**Phase 5: Content Expansion**
- [ ] Blog section for scripture memory tips
- [ ] Video walkthrough of app
- [ ] User testimonials section
- [ ] FAQ page

**Phase 6: Community Features**
- [ ] Public verse collections (shared/community verses)
- [ ] Social sharing of favorite verses
- [ ] Embed widget for external sites

**Phase 7: Marketing**
- [ ] Submit to PWA directories
- [ ] Share on Christian developer communities
- [ ] Reach out to churches/ministries
- [ ] Create social media presence

---

## 📚 Resources & References

### Design Inspiration
- https://tailwindui.com/components/marketing (Tailwind UI components)
- https://vercel.com (Clean landing page design)
- https://linear.app (Minimalist approach)

### Tools
- **OG Image Generator:** https://www.opengraph.xyz/
- **Favicon Generator:** https://realfavicongenerator.net/
- **Image Optimizer:** https://tinypng.com/
- **Link Checker:** https://validator.w3.org/checklink
- **SEO Analyzer:** https://www.seobility.net/en/seocheck/

### Legal Templates
- **Privacy Policy Generator:** https://www.privacypolicygenerator.info/
- **Terms Generator:** https://www.termsofservicegenerator.net/

### Testing Tools
- **Lighthouse:** Built into Chrome DevTools
- **PageSpeed Insights:** https://pagespeed.web.dev/
- **Mobile-Friendly Test:** https://search.google.com/test/mobile-friendly
- **Open Graph Debugger:** https://developers.facebook.com/tools/debug/
- **Twitter Card Validator:** https://cards-dev.twitter.com/validator

---

## 📝 Notes & Decisions Log

**2026-01-19: Initial Specification**
- Decided on simplified architecture (no Vue Router)
- Landing page for unauthenticated, app for authenticated
- Static HTML for additional pages (features, about, legal)
- Modal-based auth flow (existing pattern)
- Domain confirmed: https://bible-memory.app
- No existing users to migrate

**Future Decision Points:**
- Analytics tool selection (Phase 3)
- A/B testing strategy (Phase 4)
- Community features scope (Phase 6)

---

## ✅ Sign-Off

**Specification Status:** ✅ Complete - Ready for Implementation

**Next Steps:**
1. Review this spec document
2. Refine any copy/content sections as needed
3. Begin Phase 1 implementation (LandingPage.vue)
4. Create visual assets as we progress
5. Test thoroughly before moving to Phase 2

**Implementation Order:**
1. Phase 1: Core Landing Page (Priority: High - Start Here)
2. Phase 2: Static Pages (Priority: Medium)
3. Phase 3: SEO & Polish (Priority: Low - Can launch without)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Next Review:** After Phase 1 completion
