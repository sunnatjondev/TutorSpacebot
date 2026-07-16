import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('react-router-dom')) return 'vendor-router'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
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
