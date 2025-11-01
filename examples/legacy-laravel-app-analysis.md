# Legacy Laravel App - Feature Analysis

## Overview
A Laravel-based Bible memory application with a jQuery-powered single-page interface. The app focuses on spaced repetition review with multiple review modes and offline capabilities.

## Architecture

### Backend (Laravel)
- **Framework**: Laravel 5.8+ (based on dependencies)
- **Database**: MySQL/MariaDB
- **Authentication**: Laravel's built-in auth system
- **Admin Panel**: Voyager CMS integration

### Frontend
- **Style**: Single-page application (SPA) within a Blade template
- **JavaScript**: jQuery-based with custom state management
- **Storage**: localStorage/jStorage for offline data
- **UI**: Custom CSS with browser-specific stylesheets

## Data Model

### Verses Table
```php
- id (bigint, auto-increment)
- user_id (foreign key to users)
- reference (string, 50 chars) - e.g., "John 3:16"
- content (text) - the verse text
- review_cat (string, 10 chars) - 'auto', 'f', 'l', 'd', 'w', 'm'
- tags (string, 255 chars) - comma-separated tags with optional values
- ref_sort (string, 30 chars) - for sorting references
- started_at (timestamp, nullable) - when memorization began
- timestamps (created_at, updated_at)
```

### Review Categories
- **auto**: Automatic scheduling based on started_at date
- **f**: Future (not yet started)
- **l**: Learn (first 7 days)
- **d**: Daily (days 8-56)
- **w**: Weekly (days 57-112)
- **m**: Monthly (after day 112)

## Key Features

### 1. Review System
**Spaced Repetition Algorithm**:
- Learn phase: Daily for first 7 days
- Daily phase: Daily for next 8 weeks (56 days)
- Weekly phase: 1-in-7 probability for next 8 weeks
- Monthly phase: 1-in-30 probability thereafter

**Review Modes**:
- **Reference mode**: Shows reference, hide verse
- **Content mode**: Shows full verse text
- **Hints mode**: Progressive word revelation (3+ words at a time)
- **First Letters mode**: Shows only first letter of each word

**Review Interface**:
- Progress counter (e.g., "5/20")
- Navigation: Next, Previous, Back buttons
- Keyboard shortcuts: n (next), p (prev), Space (advance), h (hint), f (first letters)
- Context menu (right-click) for additional options

### 2. Flash Cards
- Adjustable difficulty levels:
  - Show Verse (0% hidden)
  - Beginner (10% hidden)
  - Intermediate (25% hidden)
  - Advanced (45% hidden)
  - Memorized (100% hidden)
- Click-to-reveal individual words
- Random word selection algorithm

### 3. Verse Management
- Add/edit verses through admin panel (Voyager)
- Verse list view with search capability
- Click verse to start review from that position
- Tags system with optional values (e.g., "theme=faith, book=John")

### 4. Meditation & Application Prompts
**Meditation Questions**:
- Who is speaking and to whom?
- What is being communicated and why?
- What makes this verse important?
- What insights does it provide?
- How does it make you feel?
- Word emphasis exercises
- Cross-reference connections

**Application Questions**:
- Goals alignment
- Decision-making guidance
- Lifestyle changes
- Problem-solving
- One project per verse memorized

### 5. Offline Capabilities
- localStorage-based data persistence
- Manual save/load functions (keyboard shortcuts: s, l)
- Context stack preservation
- Verse data caching

### 6. UI/UX Features
- Browser detection (iPhone, Android, MSIE, Mozilla, WebKit)
- Device-specific CSS loading
- Viewport meta tag for mobile
- Keyboard shortcuts for power users
- Context menus for additional actions
- Tooltip support
- Auto-scroll to top on page refresh

### 7. Additional Features
- Bible Gateway chapter lookup integration
- Date calculations for "started" tracking
- Time lapse descriptors (days/weeks/months/years)
- Reference sorting capability
- Multi-paragraph verse support with proper formatting

## Technical Implementation Details

### State Management
```javascript
// Context stack system
Context {
  mode: string,  // 'mainmenu', 'verselist', 'review', 'flashcards', etc.
  n: number,     // current verse index
  submode: string, // 'reference', 'content', 'hints', 'firstletters'
  hints: number,   // number of hint words to show
  level: number    // flashcard difficulty level
}
```

### Word Processing Functions
- `wordSplit()`: Intelligent word tokenization
- `firstLetters()`: Extract first letter of each word
- `hintWords()`: Progressive word revelation
- `htmlParas()`: Convert line breaks to HTML paragraphs
- `htmlLeadingSpaces()`: Preserve indentation

### Review Selection Logic
```javascript
// Daily review selection
- Include all 'l' (learn) and 'd' (daily) verses
- Include 'w' (weekly) with 1-in-7 probability
- Include 'm' (monthly) with 1-in-30 probability
- Respect manual review_cat overrides (shown in red)
```

## Strengths
1. **Mature review algorithm** with proven spaced repetition
2. **Rich feature set** for different learning styles
3. **Offline-first approach** with localStorage
4. **Keyboard shortcuts** for efficient navigation
5. **Meditation/application prompts** for deeper engagement
6. **Flexible tagging system**
7. **Multiple review modes** (hints, first letters, flashcards)

## Limitations
1. **jQuery dependency** (outdated approach)
2. **No real-time sync** between devices
3. **Manual save/load** required for offline data
4. **Monolithic JavaScript** in Blade template
5. **Limited mobile optimization**
6. **No progress tracking/analytics**
7. **No collaborative features**
8. **Voyager admin** may be overkill for simple CRUD

## Browser Compatibility
- Desktop: Chrome, Firefox, Safari, IE/Edge
- Mobile: iPhone Safari, Android Chrome
- Specific CSS files for iPhone and MSIE

## Dependencies
### Backend
- Laravel 5.8+
- Voyager CMS
- PHP 7.2+
- MySQL/MariaDB

### Frontend
- jQuery 1.x
- jQuery plugins:
  - scrollTo
  - contextmenu
  - shortkeys
  - cookie
  - date
  - json
  - jstorage
  - tablesorter
  - quicksearch

## Migration Considerations
1. **Preserve review algorithm** - it's well-tested
2. **Keep keyboard shortcuts** - power users rely on them
3. **Maintain review modes** - different learning styles
4. **Improve sync** - move from manual to automatic
5. **Modernize frontend** - replace jQuery with modern framework
6. **Enhance mobile** - better responsive design
7. **Add analytics** - track progress over time
8. **Simplify admin** - remove Voyager dependency
