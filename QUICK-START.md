# Quick Start Guide

Get the Bible Memory App running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PHP 8.0+ installed
- SQLite3 extension enabled

## Installation

```bash
# 1. Navigate to project
cd biblememory

# 2. Install client dependencies
cd client
npm install

# 3. Build the frontend
npm run build

# 4. Setup database
cd ../server
php api/migrate.php

# 5. Start the server
cd public
php -S localhost:8000 router.php
```

## Access the App

Open your browser to: **http://localhost:8000**

## First Login

There is no default account — the migration no longer seeds one. Create your
own from the app's sign-up screen, or with:

```bash
curl -X POST http://localhost:8000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"choose-a-real-password"}'
```

Registration is throttled to 5 attempts per hour per IP address.

## Development Mode

For hot reload during development:

```bash
cd client
npm run dev
```

Then open: **http://localhost:5173**

## Common Commands

```bash
# Build for production
cd client && npm run build

# Start dev server
cd client && npm run dev

# Reset database
cd server && rm api/db.sqlite && php api/migrate.php

# Start PHP server
cd server/public && php -S localhost:8000 router.php
```

## Project Structure

```
biblememory/
├── client/          # Frontend (TypeScript + Vue.js + Tailwind)
│   ├── src/        # Source files
│   └── index.html  # Main template
└── server/          # Backend (PHP + SQLite)
    ├── api/        # API endpoints
    └── public/     # Web root
```

## Tech Stack

- **Frontend**: TypeScript, Vue.js, Tailwind CSS v4, Vite
- **Backend**: PHP 8+, SQLite
- **Storage**: IndexedDB (Dexie.js)

## Key Features

✅ Offline-first with IndexedDB  
✅ Spaced repetition algorithm  
✅ Beautiful glass-morphism UI  
✅ Sync with server  
✅ Import/Export JSON  
✅ Search & filter verses  

## Troubleshooting

**Problem**: npm install fails  
**Solution**: Ensure Node.js 18+ is installed

**Problem**: PHP errors  
**Solution**: Check SQLite3 extension is enabled

**Problem**: Styles not loading  
**Solution**: Run `npm run build` in client directory

**Problem**: 404 errors  
**Solution**: Ensure using `router.php` with PHP server

## Next Steps

1. ✅ Add your first verse
2. ✅ Try the review mode
3. ✅ Test offline functionality
4. ✅ Export/import your data

## Documentation

- **Full Setup**: See README.md
- **API Docs**: See README.md API section
- **Implementation**: See PHASE-1-COMPLETE.md

## Support

Check the troubleshooting section in README.md for detailed help.

---

**Happy memorizing! 📖✨**
