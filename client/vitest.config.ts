import { defineConfig } from 'vitest/config'

// Standalone test config: deliberately does NOT load vite.config.ts, so the
// Vue and PWA build plugins stay out of the unit-test pipeline.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
