import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['all-tools-nihongo.onrender.com']
  },
  preview: {
    allowedHosts: ['all-tools-nihongo.onrender.com']
  }
})
