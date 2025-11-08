# Project Brief

## Project Name
Bible Memory App - Modern PWA

## Core Purpose
A modern, offline-first Bible memory application that helps users memorize scripture through spaced repetition, combining proven algorithms with beautiful UI and robust sync architecture.

## Project Origin
This project integrates the best features from three reference implementations:
1. **Legacy Laravel App** - Proven spaced repetition algorithm and review features
2. **SPA Demo** - Clean, modern UI with Alpine.js and Tailwind CSS
3. **OpLog Starter** - Robust sync architecture with IndexedDB

## Primary Goals
1. Enable effective scripture memorization through spaced repetition
2. Provide offline-first functionality for anywhere access
3. Deliver a beautiful, intuitive user experience
4. Ensure reliable multi-device synchronization
5. Maintain data integrity and user privacy

## Target Users
- Individual Christians memorizing scripture
- Small groups studying together
- Anyone wanting to build a personal verse library
- Users who need offline access (travel, limited connectivity)

## Success Criteria
- Users can add, review, and manage verses effortlessly
- App works fully offline with automatic sync when online
- Spaced repetition algorithm effectively aids memorization
- Beautiful, responsive UI works on all devices
- Zero data loss across devices and sessions

## Project Constraints
- Must work offline (IndexedDB required)
- Must sync reliably across devices
- Must be fast and responsive
- Must handle multi-paragraph verses
- Must support structured tags for organization
- Must preserve legacy data patterns where beneficial

## Current Status
**Phase 1 Complete** ✅
- Modern build system (Vite + TypeScript)
- Beautiful UI (Tailwind CSS v4 + Vue.js 3)
- Offline-first architecture (IndexedDB + Dexie.js)
- Sync infrastructure (OpLog pattern)
- Core features (CRUD, review, spaced repetition)
- Authentication (token-based)
- Production ready

## Technology Foundation
- **Frontend**: TypeScript, Vue.js 3, Tailwind CSS v4, Dexie.js, Vite
- **Backend**: PHP 8.0+, SQLite, OpLog pattern
- **Architecture**: Offline-first SPA with cursor-based sync
