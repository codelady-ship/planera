import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// JSX is compiled by Vite's built-in transform using tsconfig's "react-jsx",
// so @vitejs/plugin-react is not needed for unit tests.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
