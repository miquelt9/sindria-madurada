import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

const isHttps = process.env.HTTPS === 'true';

export default defineConfig({
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    watch: {
      ignored: ['**/research/**', '**/docs/**'],
    },
  },
  plugins: [
    react(),
    ...(isHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
      },
      manifest: {
        name: 'Síndria Madurada - Watermelon Ripeness Checker',
        short_name: 'Síndria',
        description: 'Check watermelon ripeness with your camera and knock acoustic analysis',
        theme_color: '#1B7A3D',
        background_color: '#FBF6EE',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
