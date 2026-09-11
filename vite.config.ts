import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), ...(process.env.PDFHOPE_PLAIN_VITE || process.env.VITEST ? [] : [cloudflare()])],
  build: { target: 'es2022', sourcemap: true },
})
