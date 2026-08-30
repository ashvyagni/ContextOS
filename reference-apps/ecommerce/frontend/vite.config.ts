import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/products': 'http://localhost:8002',
      '/cart': 'http://localhost:8002',
      '/orders': 'http://localhost:8002',
      '/login': 'http://localhost:8002',
      '/coupon': 'http://localhost:8002',
      '/checkout': 'http://localhost:8002',
    },
  },
})
