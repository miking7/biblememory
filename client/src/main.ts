// Import styles (Tailwind + custom)
import './styles.css';

// Import Alpine.js
import Alpine from 'alpinejs';

// Import our app
import { bibleMemoryApp } from './app';

// Make bibleMemoryApp available globally for Alpine
declare global {
  interface Window {
    Alpine: typeof Alpine;
    bibleMemoryApp: typeof bibleMemoryApp;
  }
}

// Expose Alpine and our app to window
window.Alpine = Alpine;
window.bibleMemoryApp = bibleMemoryApp;

// Start Alpine
Alpine.start();

console.log('Bible Memory App initialized with bundled Alpine.js');
