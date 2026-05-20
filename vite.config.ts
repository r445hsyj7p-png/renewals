import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@tanstack/react-table')) return 'table'
          if (id.includes('@tanstack/react-query')) return 'query'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
