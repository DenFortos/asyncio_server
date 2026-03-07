import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Порт для разработки React
    proxy: {
      // Когда React попросит данные, Vite перенаправит запрос на твой API (8001)
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      // Прокси для WebSocket (чтобы боты отображались в React)
      '/ws': {
        target: 'ws://127.0.0.1:8001',
        ws: true,
      }
    }
  }
})