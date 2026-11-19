import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // allow acme.localhost, admin.localhost, ...
    allowedHosts: ['.localhost'],
    proxy: {
      // /api/... -> FastAPI. The original Host (e.g. acme.localhost:5173)
      // is kept, so the backend still knows which RAG system is asking.
      '/api': {
        target: 'http://127.0.0.1:8000',
      },
    },
  },
})
