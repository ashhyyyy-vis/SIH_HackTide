import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The PS92 backend (app/backend) listens on 3001. Proxying keeps the
    // frontend origin-relative, so no CORS and no hardcoded host in the client.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
