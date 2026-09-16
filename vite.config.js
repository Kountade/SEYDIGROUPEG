// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Seydi Group App',
        short_name: 'SeydiApp',
        description: 'Application Seydi Group',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // ✅ CORRECTION : 10 MB au lieu de 5 MB (votre bundle fait 5.43 MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

        // ✅ Exclure les très gros fichiers du precache
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: [
          '**/node_modules/**/*',
          '**/background-login-*.jpg',
          '**/logo-DG-*.svg',
        ],

        runtimeCaching: [
          {
            urlPattern: /\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: /\.(css|js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ],

        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,   // ✅ Désactivé en dev pour éviter les bugs
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // ✅ Augmenter la limite d'avertissement (évite les warnings)
    chunkSizeWarningLimit: 6000,
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});