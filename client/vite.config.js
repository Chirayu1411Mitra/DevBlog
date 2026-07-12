import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dns from 'dns'

// Fix for the 2-second localhost connection delay
dns.setDefaultResultOrder('ipv4first')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
  },
})
