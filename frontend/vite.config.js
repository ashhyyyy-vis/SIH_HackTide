import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Shared by both the dev server and `vite preview`.
const proxy = {
  // data + AI backend (app/backend)
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
  // auth + translation backend (SIH_HackTide/backend)
  '/auth-api': {
    target: 'http://localhost:5001',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/auth-api/, '/api'),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so devtunnels / LAN / phones can reach it.
    host: true,
    // Dev tunnels serve the app from a public HTTPS hostname.
    allowedHosts: ['.devtunnels.ms', '.ngrok-free.app', 'localhost'],

    /* Both backends are proxied. This is what makes the app work over a
       tunnel: the browser only ever calls the SAME origin it loaded from,
       and Vite forwards the request server-side. An absolute
       http://localhost:3001 in the bundle would break, because "localhost"
       then means the viewer's machine, and an HTTPS page cannot call HTTP. */
    proxy,
  },

  /* `vite preview` does NOT inherit server.proxy, so it is repeated here.
     Preview serves the built bundle — a handful of files instead of the
     ~100 separate ES modules the dev server hands out. That matters over a
     dev tunnel: the tunnel cannot sustain that many concurrent HTTP/2
     streams, they drop mid-transfer (ERR_HTTP2_PING_FAILED) and React never
     mounts, leaving a blank page. Use preview for anything tunnelled or
     demoed; use the dev server locally where HMR is worth having. */
  preview: {
    host: true,
    allowedHosts: ['.devtunnels.ms', '.ngrok-free.app', 'localhost'],
    proxy,
  },
})
