# Technical Context

## Technology Stack

### Frontend Technologies

#### Core Framework
- **Vue.js 3.4.0** - Progressive JavaScript framework
  - Composition API for reactive state management
  - Single File Components (.vue files)
  - Build-time template compilation
  - Full TypeScript integration
  - Vue DevTools support
  - **Bundle Size:** 181KB JS (63KB gzipped) + 30KB CSS (6KB gzipped)
  - **Total:** ~69KB gzipped (excellent for a full-featured SPA)

#### Styling
- **Tailwind CSS v4.1.16** - Utility-first CSS framework
  - Loaded from Play CDN in Phase 1
  - Latest stable version with new architecture
  - Uses `@import "tailwindcss"` syntax (v4 change)
  - No config file needed in v4
  - Will be bundled and purged in Phase 2

#### Build Tool
- **Vite 5.4.11** - Modern build tool
  - Fast HMR (Hot Module Replacement)
  - TypeScript compilation
  - Dev server with proxy support
  - Optimized production builds
  - ES modules native support

#### Language
- **TypeScript 5.x** - Type-safe JavaScript
  - Strict mode enabled
  - Target: ES2020
  - Module: ES modules
  - Catches errors at compile time
  - Better IDE support

#### Storage
- **Dexie.js 4.0.10** - IndexedDB wrapper
  - Promise-based API
  - Schema versioning
  - Compound indexes
  - Transaction support
  - TypeScript definitions included

#### CSS Processing
- **PostCSS 8.4.49** - CSS transformation
  - Processes Tailwind directives
  - Autoprefixer for browser compatibility
  - Minification in production

### Backend Technologies

#### Language
- **PHP 8.0+** - Server-side language
  - Modern PHP features (typed properties, match expressions)
  - `declare(strict_types=1)` enforced
  - Password hashing with `password_hash()`
  - Secure random with `random_bytes()`

#### Database
- **SQLite 3.x** - Embedded database
  - WAL (Write-Ahead Logging) mode enabled
  - JSON functions for data extraction
  - Views for derived data
  - Foreign key constraints
  - Lightweight and portable

#### Server Options
- **PHP Built-in Server** - Development
  - `php -S localhost:8000 router.php`
  - Simple setup, no configuration
  - Good for local development

- **Apache** - Production option
  - `.htaccess` provided for routing
  - mod_rewrite for SPA support
  - Widely available on shared hosting

- **Nginx** - Production option
  - Example config provided
  - Better performance than Apache
  - Requires PHP-FPM configuration

## Development Setup

### Prerequisites
- **Node.js 18+** - For frontend build tools
- **npm** - Package manager (comes with Node.js)
- **PHP 8.0+** - For backend
- **SQLite3 extension** - Usually included with PHP

### Local Development Workflow

#### Initial Setup
```bash
# 1. Install frontend dependencies
cd client
npm install

# 2. Build frontend (or run dev server)
npm run build  # Production build
# OR
npm run dev    # Development with HMR

# 3. Setup database
cd ../server
php api/migrate.php

# 4. Start backend (Laravel Herd or PHP server)
# Option A: Laravel Herd (serves server/public at https://biblememory.test)
# Already running - no action needed

# Option B: PHP Built-in Server
cd server/public
php -S localhost:8000 router.php
```

#### Development Mode with Laravel Herd
```bash
# Terminal 1: Frontend dev server (with HMR)
cd client
npm run dev
# Runs at http://localhost:3000

# Access app at http://localhost:3000
# API calls automatically proxy to https://biblememory.test/api/*
# Vue DevTools shows development mode ✅
```

#### Development Mode with PHP Built-in Server
```bash
# Terminal 1: Frontend dev server (with HMR)
cd client
npm run dev
# Runs at http://localhost:3000

# Terminal 2: Backend server
cd server/public
php -S localhost:8000 router.php
# API at http://localhost:8000/api/*

# Note: If using PHP server, update vite.config.ts proxy target to http://localhost:8000
```

#### Production Testing
```bash
# Build frontend assets
cd client
npm run build

# Access via Laravel Herd
# Visit https://biblememory.test
# Serves built assets from server/public/dist/
```

#### Vite Dev Server Configuration
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000'  // Proxy API calls to PHP
    }
  },
  build: {
    outDir: '../server/public/dist',   // Output to server directory
    emptyOutDir: true
  }
});
```

### Build Process

#### Development Build
- TypeScript compiled to ES2020
- Source maps included
- No minification
- Fast rebuild times

#### Production Build
```bash
cd client
npm run build
```
- TypeScript compiled and bundled
- CSS processed and minified
- Assets hashed for cache busting
- Output to `server/public/dist/`
- Ready for deployment

### Package Management

#### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "dexie": "^3.2.4",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.16",
    "@vitejs/plugin-vue": "^5.0.0",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.16"
  }
}
```

#### Backend Dependencies
- No package manager (Composer not used)
- Pure PHP with standard library
- SQLite extension required
- PDO extension required

## Technical Constraints

### Browser Requirements
- **IndexedDB support** - Required for offline storage
- **ES2020 support** - Modern JavaScript features
- **Fetch API** - For network requests
- **LocalStorage** - For auth token (fallback)

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

### Server Requirements
- **PHP 8.0+** - Minimum version
- **SQLite3 extension** - For database
- **PDO extension** - For database access
- **JSON extension** - For API responses
- **HTTPS** - Required in production

### Storage Limits
- **IndexedDB** - Unlimited (with user permission)
- **SQLite** - Limited by disk space
- **Typical usage** - ~1MB per 1000 verses

## Development Tools

### Code Editor
- **Cursor/VSCode** - Recommended
- TypeScript language server
- ESLint for linting
- Prettier for formatting (optional)

### Browser DevTools
- **Application tab** - Inspect IndexedDB
- **Network tab** - Monitor API calls
- **Console** - Debug JavaScript
- **Sources** - Debug TypeScript (with source maps)

### Database Tools
- **SQLite Browser** - GUI for SQLite
- **sqlite3 CLI** - Command-line access
- **PHP migrate.php** - Schema management

## Configuration Files

### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### PostCSS Configuration (postcss.config.js)
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

### Vite Configuration (vite.config.ts)
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: '../server/public/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
```

## Deployment Configurations

### Apache (.htaccess)
```apache
RewriteEngine On
RewriteBase /

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Route everything else to index.php
RewriteRule ^ index.php [L]
```

### Nginx (nginx.conf.example)
```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/biblememory/server/public;
    index index.php;

    # Serve static files
    location /dist {
        try_files $uri =404;
    }

    # API endpoints
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP processing
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

### PHP Router (router.php)
```php
<?php
// For PHP built-in server only
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve static files
if (preg_match('/\.(?:png|jpg|jpeg|gif|ico|css|js|woff2?)$/', $path)) {
    return false;
}

// Route to index.php
require 'index.php';
```

## Tool Usage Patterns

### NPM Scripts
```json
{
  "scripts": {
    "dev": "vite",              // Dev server with HMR
    "build": "vite build",      // Production build
    "preview": "vite preview"   // Preview production build
  }
}
```

### Common Commands
```bash
# Frontend development
npm run dev          # Start dev server
npm run build        # Build for production
npm install          # Install dependencies

# Backend development
php api/migrate.php  # Setup database
php -S localhost:8000 router.php  # Start server

# Database management
sqlite3 api/db.sqlite  # Open database CLI
rm api/db.sqlite && php api/migrate.php  # Reset database
```

## Performance Considerations

### Frontend Optimization
- **Phase 1** - Vue.js 3 bundled and optimized (69KB gzipped total)
- **Phase 2** - Bundle and purge Tailwind CSS (smaller bundle size)
- **Lazy Loading** - Load components on demand (future)
- **Code Splitting** - Separate vendor and app code (future)

### Backend Optimization
- **WAL Mode** - Better concurrency for SQLite
- **Prepared Statements** - Faster queries, better security
- **Indexes** - Efficient data retrieval
- **Views** - Pre-computed derived data

### Network Optimization
- **Batch Operations** - Reduce HTTP requests
- **Cursor Pagination** - Efficient data transfer
- **Compression** - Gzip/Brotli for text assets
- **Caching** - Browser cache for static assets

## Security Considerations

### Development
- CORS enabled for local development
- Source maps for debugging
- No sensitive data in client code

### Production
- HTTPS required
- CORS restricted to specific origins
- No source maps
- Environment variables for secrets
- Token hashing in database
- Password hashing with bcrypt

## Known Technical Limitations

### Phase 1 Limitations
1. **Tailwind CSS Size** - Currently using CDN (~3.5MB), needs bundling and purging
2. **No Service Worker** - No background sync or offline caching
3. **No PWA Manifest** - Can't be installed as app
4. **SQLite Only** - No MySQL/PostgreSQL support
5. **Single Server** - No load balancing or clustering

### Future Improvements
- Bundle and optimize dependencies
- Add service worker for PWA
- Support multiple database backends
- Add caching layer (Redis)
- Implement CDN for static assets
