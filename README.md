<div align="center">

<img src="https://bible-memory.app/icons/icon-192.png" alt="Bible Memory Icon" width="96" height="96" />

# Bible Memory

### Hide God's Word in Your Heart

*A modern, offline-first progressive web app for memorizing Scripture through proven spaced repetition*

[![License](https://img.shields.io/badge/license-Private-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-green.svg)](https://vuejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Try It Now](https://bible-memory.app) • [Documentation](memory-bank/) • [Report Bug](https://github.com/miking7/biblememory/issues) • [Request Feature](https://github.com/miking7/biblememory/issues)

</div>

---

## ✨ Overview

Bible Memory helps you effectively memorize Scripture through scientifically-proven spaced repetition, beautiful design, and offline-first architecture. Whether you're starting your first verse or maintaining hundreds, our app makes it simple, joyful, and sustainable.

**Why Bible Memory?**
- 🌐 **Works Everywhere** - Full offline functionality, syncs when online
- 🧠 **Proven Method** - Spaced repetition algorithm (8→56→112 day intervals)
- 🎯 **Flexible Practice** - Multiple review modes (Flash Cards, Hints, First Letters, Type It)
- ✨ **Beautiful Design** - Glass-morphism UI with distraction-free immersive mode
- 🔄 **Seamless Sync** - Your progress stays in sync across all devices
- 📱 **Native-Like** - Install to home screen, works like a native app
- 💯 **Free & Open Source** - No ads, no tracking, no premium tiers

---

## 🚀 Quick Start

### For Users

**Try it now:** Visit [bible-memory.app](https://bible-memory.app) and start memorizing immediately - no installation required!

**Install as an app:**
- **iOS**: Open in Safari → Share → Add to Home Screen
- **Android**: Open in Chrome → Menu → Install app
- **Desktop**: Look for the install icon in your browser's address bar

### For Developers

```bash
# Clone the repository
git clone https://github.com/miking7/biblememory.git
cd biblememory

# Install dependencies
npm run install:client

# Set up database
npm run migrate

# Build for production
npm run build

# Serve with Laravel Herd (recommended) or PHP server
# Herd: Automatically serves at https://biblememory.test
# PHP: cd server/public && php -S localhost:8000 router.php
```

For development with hot reload:
```bash
npm run dev  # Starts at http://localhost:3000
```

See [Setup Guide](#️-setup-instructions) for detailed instructions.

---

## 💎 Features

### Core Functionality

**Verse Management**
- Add verses with AI-assisted parsing (paste any verse, we'll extract reference and clean formatting)
- Multi-paragraph support with preserved line breaks
- Structured tagging system (organize by topic, book, study series)
- Search by reference, content, or tags
- Import/Export to JSON for backups

**Spaced Repetition**
- Automatic categorization (Learn → Daily → Weekly → Monthly)
- Optimal review intervals based on memory science
- Progress tracking (streak counter, verses reviewed today)
- Visual feedback for review status

**Review Modes**
- **Flash Cards** - Hide random words (5 difficulty levels)
- **Progressive Hints** - Reveal words incrementally
- **First Letters** - Show first letter + punctuation
- **Type It** - Type the full verse (coming soon)
- **Reveal** - See full content for hard verses

**Sync & Storage**
- Offline-first with IndexedDB (works without internet)
- OpLog sync pattern with conflict resolution
- Multi-device support (phone, tablet, desktop)
- Secure token-based authentication

### User Experience

**Design**
- Glass-morphism aesthetic with gradient backgrounds
- Mobile-first responsive design
- Smooth animations and transitions
- Immersive review mode (distraction-free)
- Dark gradient theme optimized for focus

**Accessibility**
- Keyboard shortcuts (n/p for navigation, space to reveal)
- Reduced motion support for accessibility
- Touch-friendly targets on mobile
- Clean visual hierarchy

**Progressive Web App**
- Install to home screen
- Offline caching with service worker
- Auto-updates when new version available
- Works on iOS, Android, and desktop

---

## 🏗️ Technology Stack

**Frontend**
- **Framework**: Vue.js 3 (Composition API)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite 5
- **Storage**: Dexie.js (IndexedDB wrapper)
- **PWA**: vite-plugin-pwa with Workbox

**Backend**
- **Language**: PHP 8.0+
- **Database**: SQLite with WAL mode
- **Sync**: OpLog pattern with cursor-based pagination
- **Auth**: Token-based with bcrypt hashing

**Architecture**
- Offline-first SPA with automatic sync
- Last-Write-Wins conflict resolution
- Cursor-based pagination (handles millions of operations)
- Modern ES2020 JavaScript with full TypeScript types

See [techContext.md](memory-bank/techContext.md) for detailed technical information.

---

## 📖 Usage

### Adding Your First Verse

1. Click **"Add Verse"** tab
2. Paste any verse (e.g., "John 3:16 For God so loved...")
3. AI will extract reference and clean formatting
4. Optionally add tags like `fast.sk=3` or `personal`
5. Click **"Add Verse"** - it's immediately available offline!

### Reviewing Verses

1. Click **"Review"** tab to see verses due today
2. Try to recall the verse from the reference
3. Choose a review mode (Flash Cards, Hints, etc.)
4. Click **"Got it!"** or **"Again"** to track progress
5. Algorithm adjusts future review dates automatically

### Managing Your Library

1. Click **"My Verses"** tab to see all verses
2. Use search to filter by reference, content, or tags
3. Click **"⋮"** menu on any verse for actions:
   - Review This - Start review from this verse
   - Edit - Update reference or content
   - Delete - Remove verse
4. Use settings menu (⚙️) to export/import JSON backups

### Review Schedule

The spaced repetition algorithm uses optimal intervals:
- **Learn** (days 1-7): Review daily
- **Daily** (days 8-56): Review daily
- **Weekly** (days 57-112): 1-in-7 chance per session
- **Monthly** (day 113+): 1-in-30 chance per session

This ensures new verses get frequent practice while maintaining long-term retention of established verses.

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js 18+** (for frontend development)
- **PHP 8.0+** with SQLite3 extension
- **Laravel Herd** (recommended) or PHP built-in server

### Installation Steps

1. **Clone and install**
   ```bash
   git clone https://github.com/miking7/biblememory.git
   cd biblememory
   npm run install:client
   ```

2. **Database setup**
   ```bash
   npm run migrate  # Creates tables in server/api/db.sqlite
   ```

3. **Build frontend**
   ```bash
   npm run build  # Outputs to server/public/dist/
   ```

4. **Serve the app**

   **Option A: Laravel Herd (Recommended)**
   - Herd automatically serves `server/public/` at `https://biblememory.test`
   - Visit `https://biblememory.test` - done!

   **Option B: PHP Built-in Server**
   ```bash
   cd server/public
   php -S localhost:8000 router.php
   ```
   - Visit `http://localhost:8000`

### Development Workflow

**Frontend development with HMR:**
```bash
npm run dev  # Starts Vite at http://localhost:3000
```
- API calls proxy to backend automatically
- Hot module replacement for instant feedback
- Vue DevTools available in browser

**Database management:**
```bash
npm run db:reset  # Delete and recreate database
npm run db:open   # Open SQLite CLI for queries
```

**All commands work from project root!** No need to `cd` into subdirectories.

See [techContext.md](memory-bank/techContext.md) for deployment configurations (Apache, Nginx) and advanced setup.

---

## 📁 Project Structure

```
biblememory/
├── client/                    # Vue 3 frontend (TypeScript + Vite)
│   ├── src/
│   │   ├── App.vue           # Main component with conditional rendering
│   │   ├── LandingPage.vue   # Marketing page for guests
│   │   ├── main.ts           # Vue app initialization
│   │   ├── app.ts            # App orchestration (composables)
│   │   ├── db.ts             # Dexie schema (IndexedDB)
│   │   ├── actions.ts        # CRUD operations + OpLog creation
│   │   ├── sync.ts           # Push/pull sync logic
│   │   ├── composables/      # Vue 3 composables pattern
│   │   │   ├── useAuth.ts    # Authentication state
│   │   │   ├── useVerses.ts  # Verse CRUD and filtering
│   │   │   ├── useReview.ts  # Review system + animations
│   │   │   └── useSync.ts    # Sync scheduling
│   │   └── components/       # Reusable Vue components
│   ├── index.html            # Entry point with SEO meta tags
│   ├── vite.config.ts        # Vite configuration + PWA plugin
│   └── package.json          # Dependencies
│
├── server/                    # PHP backend
│   ├── public/
│   │   ├── dist/             # Built assets (generated by Vite)
│   │   ├── icons/            # PWA icons
│   │   ├── index.php         # SPA entry point
│   │   └── router.php        # PHP built-in server router
│   ├── api/                  # REST API endpoints
│   │   ├── register.php      # User registration
│   │   ├── login.php         # Authentication
│   │   ├── logout.php        # Session termination
│   │   ├── push.php          # Sync operations to server
│   │   ├── pull.php          # Sync operations from server
│   │   ├── migrate.php       # Database setup script
│   │   └── lib.php           # Shared functions
│   └── schema.sql            # Database schema (SQLite)
│
└── memory-bank/              # 📚 Project documentation
    ├── projectbrief.md       # Project foundation and goals
    ├── productContext.md     # User experience and features
    ├── systemPatterns.md     # Architecture decisions
    ├── techContext.md        # Technology stack details
    ├── progress.md           # Roadmap and status
    ├── activeContext.md      # Current work focus
    └── previous-work/        # Archived implementation sessions
```

---

## 🔌 API Reference

### Authentication

**Register**
```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response: {
  "user_id": "uuid",
  "token": "64-char-hex"
}
```

**Login**
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response: {
  "user_id": "uuid",
  "token": "64-char-hex"
}
```

**Logout**
```http
POST /api/logout
X-Auth-Token: your-token-here

Response: { "ok": true }
```

### Sync Operations

**Push (Client → Server)**
```http
POST /api/push
X-Auth-Token: your-token-here
Content-Type: application/json

{
  "client_id": "device-uuid",
  "ops": [
    {
      "id": "op-uuid",
      "table": "verses",
      "row_id": "verse-uuid",
      "op_type": "insert",
      "data": { "reference": "John 3:16", ... },
      "ts": 1234567890
    }
  ]
}

Response: {
  "ok": true,
  "acked_ids": ["op-uuid"],
  "cursor": 123
}
```

**Pull (Server → Client)**
```http
GET /api/pull?since=0&limit=500
X-Auth-Token: your-token-here

Response: {
  "cursor": 123,
  "ops": [...]
}
```

---

## 🗺️ Roadmap

### ✅ Phase 1 Complete: Foundation + Landing Page
- Core infrastructure (build system, offline-first, sync, auth)
- Basic review functionality (reference → content reveal)
- CRUD operations with multi-device sync
- **NEW**: Professional landing page for first-time visitors
- **NEW**: SEO optimization with comprehensive meta tags
- **NEW**: Scroll-triggered fade-in animations

### ✅ Phase 2 Complete: Enhanced Review Modes
- Flash Cards with 5 difficulty levels
- Progressive Hints mode
- First Letters mode
- Keyboard shortcuts (n, p, h, f, c, space, escape, i)
- Immersive review mode
- Card slide animations with accessibility
- Review tracking (Got it! / Again buttons)

### 🚧 Phase 2.5: Landing Page Polish (In Progress)
- [ ] Static pages (features.html, about.html, privacy.html, terms.html)
- [ ] Real hero image and app screenshots
- [ ] og-image.png for social sharing (1200x630)
- [ ] Sitemap.xml for SEO
- [ ] Structured data (JSON-LD)

### 📋 Phase 3: Deep Engagement (Planned)
- Meditation questions (structured reflection prompts)
- Application questions (Goals, Decisions, Lifestyle, Problems)
- BibleGateway chapter lookup integration
- Context-sensitive help and guidance

### 🎯 Phase 4: Modern Enhancements (Future)
- Statistics dashboard with charts
- Dark mode toggle
- Streak achievements and gamification
- Background sync API
- Push notifications for review reminders
- Social features (share verses, group study)

See [progress.md](memory-bank/progress.md) for detailed feature status and implementation notes.

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report bugs** - Open an issue with steps to reproduce
2. **Suggest features** - Share your ideas in GitHub Issues
3. **Submit PRs** - Fork, create a feature branch, and submit a pull request
4. **Improve docs** - Help us make documentation clearer
5. **Share feedback** - Tell us how we can improve

**Development Guidelines:**
- Follow existing code style (TypeScript, Vue 3 Composition API)
- Write clear commit messages
- Test on mobile and desktop before submitting
- Update documentation for new features

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines (coming soon).

---

## 🐛 Troubleshooting

**App won't load**
- Check browser console for errors
- Ensure you're using a modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Clear browser cache and reload

**Sync not working**
- Check network connection
- Verify you're logged in (look for offline badge)
- Try manual sync by navigating between tabs

**Database errors**
```bash
npm run db:reset  # Resets database (WARNING: loses data)
```

**Build fails**
```bash
npm run install:client  # Reinstall dependencies
npm run build           # Try building again
```

See [techContext.md](memory-bank/techContext.md) for detailed troubleshooting.

---

## 📚 Documentation

Comprehensive project documentation is available in the `memory-bank/` directory:

- **[projectbrief.md](memory-bank/projectbrief.md)** - Project vision and goals
- **[productContext.md](memory-bank/productContext.md)** - User experience and features
- **[systemPatterns.md](memory-bank/systemPatterns.md)** - Architecture and design patterns
- **[techContext.md](memory-bank/techContext.md)** - Technology stack and setup
- **[progress.md](memory-bank/progress.md)** - Roadmap and feature status
- **[activeContext.md](memory-bank/activeContext.md)** - Current work focus

These documents follow the [Memory Bank](https://github.com/cline/memory-bank) pattern for AI-assisted development.

---

## 👨‍💻 Author

**Michael Engelbrecht**
- GitHub: [@miking7](https://github.com/miking7)

Built with love for believers who want to hide God's Word in their hearts.

---

## 📄 License

Private project - All rights reserved (for now)

*Considering open source license options for future release*

---

## 🙏 Acknowledgments

Built with love for believers who want to hide God's Word in their hearts.

**Key Technologies:**
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [Vite](https://vitejs.dev/) - Lightning-fast build tool
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Dexie.js](https://dexie.org/) - Minimalistic IndexedDB wrapper
- [Workbox](https://developers.google.com/web/tools/workbox) - Service worker toolkit

**Inspiration:**
- Spaced repetition research (Ebbinghaus, Pimsleur, SuperMemo)
- Modern SaaS landing pages (Stripe, Linear, Vercel)
- Progressive Web App best practices (Google, Microsoft)

---

<div align="center">

**⭐ Star this repo if it helps you memorize Scripture!**

[Try It Now](https://bible-memory.app) • [Report Bug](https://github.com/miking7/biblememory/issues) • [Request Feature](https://github.com/miking7/biblememory/issues)

*Last Updated: January 2025*

</div>
