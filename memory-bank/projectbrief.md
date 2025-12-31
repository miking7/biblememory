# Project Brief

<!-- 
MAINTENANCE PRINCIPLES (from .clinerules):
- Foundation document that shapes all other memory bank files
- Defines core requirements, goals, and project scope
- High-level only - details go in other files
- Update when project scope or goals fundamentally change
- Keep stable - this shouldn't change often once established
- Source of truth for "what we're building and why"
-->

## Project Name
Bible Memory App - Modern PWA

## Core Purpose
A modern, offline-first Bible memory application that helps users memorize scripture through spaced repetition, combining proven algorithms with beautiful UI and robust sync architecture.

## Project Origin

This project evolved from three reference implementations:

1. **Legacy Laravel App** (Active Reference)
   - Status: Still accessible at `/legacy/` with full feature set
   - Provides: Proven spaced repetition + 5 review modes + meditation tools
   - Role: Feature reference during transition to modern app
   - Future: Will be phased out once modern app achieves feature parity

2. **SPA Demo** (Historical - Integrated)
   - Status: Fully integrated into modern Vue 3 app
   - Contributed: Clean UI patterns, Tailwind CSS styling
   - No longer exists as separate codebase

3. **OpLog Starter** (Historical - Integrated)
   - Status: Fully integrated into modern app
   - Contributed: Sync architecture, IndexedDB patterns, cursor pagination
   - No longer exists as separate codebase

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

## Migration Strategy

The project is incrementally replacing the legacy Laravel app with a modern Vue 3 PWA:

**Phase 1 (Complete):** Foundation + Basic Features
- Modern build system (Vite + TypeScript + Vue 3)
- Offline-first architecture (IndexedDB + OpLog sync)
- Basic review functionality (reference → content reveal)
- CRUD operations with multi-device sync
- Authentication and data security

**Phase 2 (Planned):** Enhanced Review Modes
- Flash Cards with 5 difficulty levels
- First Letters and Progressive Hints modes
- Comprehensive keyboard shortcuts
- UX improvements (quick jump, human-readable times)

**Phase 3 (Planned):** Deep Engagement
- Meditation and Application question prompts
- BibleGateway integration
- Advanced reflection tools

**Phase 4 (Future):** Modern Enhancements
- Features legacy app doesn't have
- Statistics dashboard, dark mode, PWA capabilities

**Legacy Bridge:**
- "Legacy..." button provides access to advanced features during transition
- Data flows: Modern app → localStorage → Legacy app (one-way)
- Users can seamlessly switch between apps as needed

## Current Status

**Phase 1 Complete** ✅ (Basic Features)
- Modern build system (Vite + TypeScript)
- Beautiful UI (Tailwind CSS v4 + Vue.js 3)
- Offline-first architecture (IndexedDB + Dexie.js)
- Sync infrastructure (OpLog pattern)
- Basic review functionality (reference → content reveal)
- Verse CRUD with search and filtering
- Authentication (token-based)
- Multi-device sync with conflict resolution

**Production Ready:** For basic daily memorization workflows

**Legacy App:** Remains accessible for advanced features (Flash Cards, Hints, Meditation prompts) until Phase 2+ complete

## Technology Foundation
- **Frontend**: TypeScript, Vue.js 3, Tailwind CSS v4, Dexie.js, Vite
- **Backend**: PHP 8.0+, SQLite, OpLog pattern
- **Architecture**: Offline-first SPA with cursor-based sync
