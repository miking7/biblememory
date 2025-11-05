# Bible Memory App - Modern PWA

A modern, offline-first Bible memory application with beautiful UI, combining the best features from three reference implementations:
- **Legacy Laravel App**: Proven spaced repetition algorithm
- **SPA Demo**: Clean, modern UI with Alpine.js and Tailwind CSS
- **OpLog Starter**: Robust sync architecture with IndexedDB

## 🎉 Phase 1 Complete!

The app is now fully functional with a modern build system, beautiful UI, and offline-first architecture.

## ✨ Features

### Phase 1 (✅ Complete)
- ✅ Modern build system (Vite + TypeScript)
- ✅ Beautiful UI with Tailwind CSS v4 and Alpine.js
- ✅ Verse CRUD (add, edit, delete, list)
- ✅ Basic review mode (reference → content reveal)
- ✅ Spaced repetition algorithm (learn/daily/weekly/monthly)
- ✅ Offline-first with IndexedDB (Dexie.js)
- ✅ Sync with server (push/pull with cursor-based pagination)
- ✅ Search/filter verses
- ✅ Import/export JSON
- ✅ Tags system with comma-separated input
- ✅ Multi-paragraph verse support
- ✅ Authentication (token-based)
- ✅ Glass-morphism design with gradient backgrounds
- ✅ Responsive layout
- ✅ Smooth animations and transitions

## 🚀 Technology Stack

### Frontend
- **TypeScript** - Type-safe client code
- **Alpine.js 3.x** - Lightweight reactive framework (bundled via npm)
- **Tailwind CSS v4.1.16** - Latest stable utility-first CSS framework
- **Dexie.js** - IndexedDB wrapper for offline storage
- **Vite 5.x** - Modern build tool with hot module replacement

### Backend
- **PHP 8.0+** - Server-side language
- **SQLite** - Database (development and production)
- **OpLog Pattern** - Operation log for sync
- **Token-based Auth** - Simple authentication

## 📁 Project Structure

```
biblememory/
├── client/                     # Frontend application
│   ├── src/
│   │   ├── main.ts            # Entry point, Alpine initialization
│   │   ├── app.ts             # Alpine.js app component
│   │   ├── db.ts              # Dexie schema & IndexedDB
│   │   ├── actions.ts         # Verse CRUD operations
│   │   ├── sync.ts            # Push/pull sync logic
│   │   └── styles.css         # Tailwind imports & custom styles
│   ├── index.html             # Main HTML template
│   ├── package.json           # Dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── vite.config.ts         # Vite build config
│   └── postcss.config.js      # PostCSS config
│
├── server/                     # Backend application
│   ├── public/
│   │   ├── dist/              # Built frontend assets (generated)
│   │   ├── index.php          # Main router
│   │   ├── router.php         # PHP built-in server router
│   │   └── .htaccess          # Apache configuration
│   ├── api/
│   │   ├── lib.php            # Shared functions
│   │   ├── register.php       # User registration
│   │   ├── login.php          # User login
│   │   ├── logout.php         # User logout
│   │   ├── push.php           # Push operations
│   │   ├── pull.php           # Pull operations
│   │   └── migrate.php        # Database setup
│   ├── schema.sql             # Database schema
│   └── nginx.conf.example     # Nginx configuration example
│
├── examples/                   # Reference implementations
│   ├── legacy-laravel-app/    # Original Laravel implementation
│   ├── spa-demo/              # UI reference implementation
│   ├── bible-memory-oplog-starter/  # Sync pattern reference
│   └── legacy-data/           # Sample data for testing
│
├── memory-bank/               # 📚 Project documentation
│   ├── projectbrief.md        # Project foundation and goals
│   ├── productContext.md      # User experience and features
│   ├── systemPatterns.md      # Architecture and design patterns
│   ├── techContext.md         # Technology stack and setup
│   ├── activeContext.md       # Current work and decisions
│   ├── progress.md            # What works and what's next
│   ├── testing.md             # Testing strategy and checklist
│   └── dataSpecifications.md  # Data model details
│
└── README.md                   # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js 18+** (for client development)
- **PHP 8.0+** (for server)
- **SQLite3** extension enabled in PHP

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd biblememory
```

2. **Set up the client**
```bash
cd client
npm install
npm run build
```

3. **Set up the server**
```bash
cd ../server
php api/migrate.php
```

4. **Start the server**
```bash
cd public
php -S localhost:8000 router.php
```

5. **Open the app**
```
http://localhost:8000
```

### Development Mode

For frontend development with hot reload:

```bash
cd client
npm run dev
```

This starts Vite dev server at `http://localhost:5173` with hot module replacement.

## 📝 Detailed Setup

### Client Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

This installs:
- Alpine.js (reactive framework)
- Tailwind CSS v4 (styling)
- Dexie.js (IndexedDB wrapper)
- Vite (build tool)
- TypeScript (type safety)

3. **Development mode** (with hot reload):
```bash
npm run dev
```
App available at `http://localhost:5173`

4. **Production build**:
```bash
npm run build
```
Builds to `../server/public/dist/`

### Server Setup

1. Navigate to server directory:
```bash
cd server
```

2. Run database migration:
```bash
php api/migrate.php
```

This will:
- Create `api/db.sqlite` database
- Create all required tables (users, verses, reviews, oplog)
- Create a test user:
  - Email: `test@example.com`
  - Password: `password123`
- Display the test user's token

3. Start PHP built-in server:
```bash
cd public
php -S localhost:8000 router.php
```

The app will be available at `http://localhost:8000`

### Production Deployment

#### Option 1: Apache

1. Build the client:
```bash
cd client
npm run build
```

2. Copy files to web server:
```bash
# Copy server directory
cp -r server/ /var/www/biblememory/

# Ensure proper permissions
chmod 755 /var/www/biblememory/api
chmod 666 /var/www/biblememory/api/db.sqlite
```

3. The `.htaccess` file in `server/public/` handles routing

#### Option 2: Nginx

1. Build the client:
```bash
cd client
npm run build
```

2. Copy files to web server:
```bash
cp -r server/ /var/www/biblememory/
```

3. Use the provided `server/nginx.conf.example` as a template

4. Configure Nginx to:
   - Serve static files from `server/public/dist/`
   - Proxy `/api/*` requests to PHP-FPM
   - Fallback to `index.php` for SPA routing

## 💡 Usage

### Adding Verses

1. Click the **"📝 Add Verse"** tab
2. Fill in the form:
   - **Reference**: e.g., "John 3:16"
   - **Reference Sort**: e.g., "bible.43003016" (format: bible.BBCCCVVV)
     - BB = book number (01-66)
     - CCC = chapter (001-999)
     - VVV = verse (001-999)
   - **Verse Text**: The verse content (supports multi-paragraph with line breaks)
   - **Translation**: e.g., "NIV", "ESV", "KJV" (optional)
   - **Tags**: Comma-separated, e.g., "fast.sk=3, ss=2010.Q2.W01, personal" (optional)
3. Click **"Add Verse"**

### Reviewing Verses

1. Click the **"🎯 Review"** tab
2. You'll see verses due for review based on spaced repetition
3. Click **"Reveal Verse"** to see the content
4. Mark as **"✓ Got it!"** or **"Need Practice"**

### Managing Verses

1. Click the **"📚 My Verses"** tab
2. Use the search box to filter verses
3. Click **"Edit"** to modify a verse
4. Click **"Delete"** to remove a verse
5. Click **"Export"** to download all verses as JSON
6. Click **"Import"** to upload verses from JSON

### Spaced Repetition Schedule

The app uses a proven spaced repetition algorithm:

- **Learn** (first 7 days): Daily review
- **Daily** (days 8-56): Daily review
- **Weekly** (days 57-112): 1-in-7 probability
- **Monthly** (after day 112): 1-in-30 probability

## 🔌 API Endpoints

### Authentication

```http
POST /api/register.php
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "user_id": "uuid",
  "token": "64-char-hex"
}
```

```http
POST /api/login.php
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "user_id": "uuid",
  "token": "64-char-hex"
}
```

```http
POST /api/logout.php
X-Auth-Token: your-token-here

Response: {
  "ok": true
}
```

### Sync

```http
POST /api/push.php
X-Auth-Token: your-token-here
Content-Type: application/json

{
  "client_id": "device-id",
  "ops": [
    {
      "id": "op-uuid",
      "table": "verses",
      "row_id": "verse-uuid",
      "op_type": "insert",
      "data": { ... },
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

```http
GET /api/pull.php?since=0&limit=500
X-Auth-Token: your-token-here

Response: {
  "cursor": 123,
  "ops": [...]
}
```

## 📊 Data Model

### Verse
```typescript
{
  id: string              // UUID v4
  reference: string       // "John 3:16"
  refSort: string         // "bible.43003016"
  content: string         // Verse text with \n for line breaks
  translation: string     // "NIV", "ESV", "KJV"
  reviewCat: string       // "auto", "future", "learn", "daily", "weekly", "monthly"
  startedAt: number|null  // Epoch ms
  tags: Array<{key, value}>
  favorite: boolean
  createdAt: number       // Epoch ms
  updatedAt: number       // Epoch ms
}
```

### Review
```typescript
{
  id: string              // UUID v4
  verseId: string         // Foreign key
  reviewType: string      // "recall", "practice"
  createdAt: number       // Epoch ms
}
```

## 🎨 UI Features

### Design System
- **Color Scheme**: Deep blue/purple gradients
- **Typography**: Inter font family
- **Components**: Glass-morphism cards with backdrop blur
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design with Tailwind breakpoints

### Key UI Elements
- Gradient background (blue → purple → slate)
- Frosted glass cards with blur effects
- Rounded corners and shadows
- Color-coded stats cards
- Smooth hover animations
- Badge notifications for due reviews
- Modal dialogs for editing

## 🧪 Development

### Available Commands

```bash
# Client
cd client
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run preview      # Preview production build

# Server
cd server
php api/migrate.php  # Run database migrations
cd public
php -S localhost:8000 router.php  # Start dev server
```

### Code Style
- **TypeScript**: Strict mode enabled
- **PHP**: PSR-12 coding standard
- **CSS**: Tailwind utility classes + custom CSS for complex styles
- Use meaningful variable names
- Add comments for complex logic

### Testing Checklist
- [ ] Add a verse
- [ ] Edit the verse
- [ ] Delete the verse
- [ ] Search for verses
- [ ] Review verses (mark as "Got it" and "Need Practice")
- [ ] Export verses to JSON
- [ ] Import verses from JSON
- [ ] Test offline mode (disconnect network, add verse)
- [ ] Test sync (reconnect network, verify sync)
- [ ] Test on mobile device
- [ ] Test in different browsers

## 🐛 Troubleshooting

### Client Issues

**Problem**: `npm install` fails
**Solution**: Ensure Node.js 18+ is installed, try `npm cache clean --force`

**Problem**: Build fails with TypeScript errors
**Solution**: Run `npm install` to ensure all dependencies are installed

**Problem**: Styles not loading
**Solution**: Ensure Tailwind CSS v4 is installed, rebuild with `npm run build`

**Problem**: App doesn't load in browser
**Solution**: Check browser console for errors, ensure dev server is running

### Server Issues

**Problem**: Database errors
**Solution**: Delete `api/db.sqlite` and run `php api/migrate.php` again

**Problem**: Authentication fails
**Solution**: 
- Check that token is being sent in `X-Auth-Token` header
- Verify token in database `users` table
- Try logging in again to get a fresh token

**Problem**: CORS errors
**Solution**: Ensure `handle_cors()` is called in all API endpoints

**Problem**: 404 errors for assets
**Solution**: 
- Verify build completed successfully
- Check that `server/public/dist/` directory exists
- Ensure `router.php` is being used with PHP built-in server

**Problem**: PHP errors about SQLite
**Solution**: Ensure SQLite3 extension is enabled in `php.ini`

## 🚀 Future Phases

### Phase 2 (Planned)
- Multiple review modes (hints, first letters, flashcards)
- Keyboard shortcuts for power users
- Statistics dashboard with charts
- Streak tracking and achievements
- PWA manifest for installability
- Dark mode toggle
- Verse categories/collections

### Phase 3 (Planned)
- Meditation/application prompts
- Push notifications for review reminders
- Service worker for background sync
- Progress charts and analytics
- Social features (share verses)
- Audio playback for verses

## 📄 License

Private project - All rights reserved

## 🙏 Credits

Built by integrating patterns from:
- Legacy Laravel Bible Memory App (spaced repetition algorithm)
- Modern SPA Demo (UI/UX patterns)
- OpLog Sync Starter (offline-first architecture)

---

**Current Status**: Phase 1 Complete ✅  
**Version**: 1.0.0  
**Last Updated**: January 2025

## 📚 Documentation

For detailed project documentation, see the **memory-bank/** directory:

- **[projectbrief.md](memory-bank/projectbrief.md)** - Project foundation, goals, and success criteria
- **[productContext.md](memory-bank/productContext.md)** - User experience, features, and priorities
- **[systemPatterns.md](memory-bank/systemPatterns.md)** - Architecture, design patterns, and data flow
- **[techContext.md](memory-bank/techContext.md)** - Technology stack, setup, and development workflow
- **[activeContext.md](memory-bank/activeContext.md)** - Current work focus and recent decisions
- **[progress.md](memory-bank/progress.md)** - What works, what's next, and technical debt
- **[testing.md](memory-bank/testing.md)** - Testing strategy, checklist, and compliance
- **[dataSpecifications.md](memory-bank/dataSpecifications.md)** - Data model, formats, and validation

The memory-bank serves as the single source of truth for understanding the project's architecture, decisions, and current state.
