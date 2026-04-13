import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { weatherApiPlugin } from './api-plugin.js'
import { seoPlugin } from './seo-plugin.js'

export default defineConfig({
  plugins: [react(), weatherApiPlugin(), seoPlugin()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    watch: {
      ignored: ['**/.local/**', '**/node_modules/**']
    },
    proxy: {
      '/firms-proxy': {
        target: 'https://firms.modaps.eosdis.nasa.gov',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/firms-proxy/, '')
      }
    }
  }
})
