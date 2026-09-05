import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Firebase emulator traffic is proxied through the dev server so the browser only ever
// talks to the page's own origin (works on phones / tunnelled previews, no mixed content).
const AUTH_EMULATOR = 'http://127.0.0.1:9099'
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8081'
const emulatorProxy = {
  '/identitytoolkit.googleapis.com': { target: AUTH_EMULATOR, changeOrigin: true },
  '/securetoken.googleapis.com': { target: AUTH_EMULATOR, changeOrigin: true },
  '/emulator': { target: AUTH_EMULATOR, changeOrigin: true },
  '/google.firestore.v1.Firestore': { target: FIRESTORE_EMULATOR, changeOrigin: true },
  '/v1/projects': { target: FIRESTORE_EMULATOR, changeOrigin: true },
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180.png', 'offline.html'],
      manifest: {
        name: 'frisbee',
        short_name: 'frisbee',
        description: 'Find your people on campus — friends, skills, rides, events and more at SRM AP.',
        id: '/',
        start_url: '/home',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#FF5A1F',
        background_color: '#F4F5F7',
        lang: 'en',
        categories: ['social', 'education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Messages', url: '/messages', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Discover', url: '/discover', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Happening', url: '/happening', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cloudinary-hosted avatars & post images
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'media',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Firestore / Auth have their own offline layer — never let Workbox interfere
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 8 },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      ...(loadEnv(mode, process.cwd(), 'VITE_').VITE_USE_EMULATORS === 'true' ? emulatorProxy : {}),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
}))
