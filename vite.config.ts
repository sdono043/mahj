import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub Pages project URL (sdono043.github.io/mahj/).
export default defineConfig({
  base: '/mahj/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
