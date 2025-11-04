# Bible Memory App - Phase 1

A modern, offline-first Bible memory application combining the best features from three reference implementations:
- **Legacy Laravel App**: Proven spaced repetition algorithm
- **SPA Demo**: Clean, modern UI with Alpine.js and Tailwind CSS
- **OpLog Starter**: Robust sync architecture with IndexedDB

## Features

### Phase 1 (Current)
- ✅ Verse CRUD (add, edit, delete, list)
- ✅ Basic review mode (reference → content reveal)
- ✅ Spaced repetition algorithm (learn/daily/weekly/monthly)
- ✅ Offline-first with IndexedDB (Dexie.js)
- ✅ Sync with server (push/pull with cursor-based pagination)
- ✅ Search/filter verses
- ✅ Import/export JSON
- ✅ Modern UI (Tailwind + Alpine.js)
- ✅ Tags system with comma-separated input
- ✅ Multi-paragraph verse support
- ✅ Authentication (token-based)

## Technology Stack

### Frontend
- **TypeScript** - Type-safe client code
- **Alpine.js 3.x** - Lightweight reactive framework (CDN)
- **Tailwind CSS** - Utility-first CSS (Play CDN)
- **Dexie.js** - IndexedDB wrapper for offline storage
- **Vite** - Dev server and TypeScript compilation

### Backend
- **PHP 8.0+** - Server-side language
- **SQLite** - Database (development and production)
- **OpLog Pattern** - Operation log for sync
- **Token-based Auth** - Simple authentication

## Project Structure

```
bible-memory/
├── client/
│   ├── src/
│   │   ├── db.ts              # Dexie schema
│   │   ├── actions.ts         # Verse CRUD operations
│   │   ├── sync.ts            # Push/pull sync logic
│   │   └── main.ts            # Alpine.js app
│   ├── public/
│   │   └── index.html         # Main HTML file
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── api/
│   │   ├── lib.php            # Shared functions
│   │   ├── register.php       # User registration
│   │   ├── login.php          # User login
│   │   ├── logout.php         # User logout
│   │   ├── push.php           # Push operations
│   │   ├── pull.php           # Pull operations
│   │   └── migrate.php        # Database setup
│   └── schema.sql             # Database schema
├── examples/                   # Reference implementations
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ (for client development)
- PHP 8.0+ (for server)
- SQLite3 extension enabled in PHP

### Client Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

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
- Create all database tables
- Create a test user (email: test@example.com, password: password123)
- Display the test user's credentials and token

3. Start PHP server:
```bash
php -S localhost:8000
```

The API will be available at `http://localhost:8000/api`

### Production Build

1. Build the client:
```bash
cd client
npm run build
```

2. The built files will be in `client/dist/`

3. Deploy:
   - Copy `client/dist/` contents to your web server
   - Copy `server/` directory to your web server
   - Ensure PHP has write permissions for `server/api/db.sqlite`
   - Configure your web server to proxy `/api` requests to PHP

## Usage

### Adding Verses

1. Click the "Add Verse" tab
2. Fill in the form:
   - **Reference**: e.g., "John 3:16"
   - **Reference Sort**: e.g., "bible.43003016" (for proper ordering)
   - **Verse Text**: The verse content (supports multi-paragraph with line breaks)
   - **Translation**: e.g., "NIV", "ESV", "KJV" (optional)
   - **Tags**: Comma-separated, e.g., "fast.sk=3, personal" (optional)
3. Click "Add Verse"

### Reviewing Verses

1. Click the "Review" tab
2. You'll see verses due for review based on spaced repetition
3. Click "Reveal Verse" to see the content
4. Mark as "Got it!" or "Need Practice"

### Spaced Repetition Schedule

- **Learn** (first 7 days): Daily review
- **Daily** (days 8-56): Daily review
- **Weekly** (days 57-112): 1-in-7 probability
- **Monthly** (after day 112): 1-in-30 probability

### Import/Export

- **Export**: Click "Export" in "My Verses" tab to download JSON
- **Import**: Click "Import" and select a JSON file

## API Endpoints

### Authentication

```
POST /api/register.php
Body: { "email": "user@example.com", "password": "password123" }
Response: { "user_id": "uuid", "token": "64-char-hex" }

POST /api/login.php
Body: { "email": "user@example.com", "password": "password123" }
Response: { "user_id": "uuid", "token": "64-char-hex" }

POST /api/logout.php
Headers: { "X-Auth-Token": "token" }
Response: { "ok": true }
```

### Sync

```
POST /api/push.php
Headers: { "X-Auth-Token": "token" }
Body: { "client_id": "device-id", "ops": [...] }
Response: { "ok": true, "acked_ids": [...], "cursor": 123 }

GET /api/pull.php?since=0&limit=500
Headers: { "X-Auth-Token": "token" }
Response: { "cursor": 123, "ops": [...] }
```

## Data Model

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

## Development

### Running Tests
```bash
# Manual testing checklist
# 1. Add a verse
# 2. Edit the verse
# 3. Delete the verse
# 4. Search for verses
# 5. Review verses
# 6. Export verses
# 7. Import verses
# 8. Test offline mode (disconnect network)
# 9. Test sync (reconnect network)
```

### Code Style
- TypeScript: Strict mode enabled
- PHP: PSR-12 coding standard
- Use meaningful variable names
- Add comments for complex logic

## Troubleshooting

### Client Issues

**Problem**: TypeScript errors about missing modules
**Solution**: Run `npm install` in the client directory

**Problem**: App doesn't load
**Solution**: Check browser console for errors, ensure Vite dev server is running

### Server Issues

**Problem**: Database errors
**Solution**: Run `php api/migrate.php` to recreate database

**Problem**: Authentication fails
**Solution**: Check that token is being sent in `X-Auth-Token` header

**Problem**: CORS errors
**Solution**: Ensure `handle_cors()` is called in all API endpoints

## Future Phases

### Phase 2
- Multiple review modes (hints, first letters, flashcards)
- Keyboard shortcuts
- Statistics dashboard
- Streak tracking
- PWA manifest
- Dark mode

### Phase 3
- Meditation/application prompts
- Push notifications
- Service worker (background sync)
- Progress charts/analytics

## Contributing

This is a personal project, but suggestions and bug reports are welcome!

## License

Private project - All rights reserved

## Credits

Built by integrating patterns from:
- Legacy Laravel Bible Memory App
- Modern SPA Demo
- OpLog Sync Starter

---

**Note**: This is Phase 1 implementation. See `examples/INTEGRATION-SPECIFICATION.md` for full project plan.
