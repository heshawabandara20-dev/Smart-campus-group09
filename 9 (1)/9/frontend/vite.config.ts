import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      // Workaround for missing `scheduler` package entrypoint in this environment.
      scheduler:
        command === 'serve'
          ? 'scheduler/cjs/scheduler.development.js'
          : 'scheduler/cjs/scheduler.production.js',
    },
  },
}))
