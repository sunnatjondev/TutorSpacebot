import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Allow all hosts including localtunnel / ngrok
    allowedHosts: 'all',
    headers: {
      // Required for Telegram WebApp to load inside Telegram
      'Access-Control-Allow-Origin': '*',
    },
  },
})
