import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // Render TSX regression fixtures without changing Next.js jsx=preserve.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
