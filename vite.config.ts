import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Temporary deployment: serve at root on port 8081; allow override via env
  base: process.env.VITE_PUBLIC_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost'
  }
}))
