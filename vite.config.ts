import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { UserConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const prodConfig: UserConfig = {
  plugins: [
    vue(),
    VitePWA({
      includeAssets: [
        'favicon.ico',
        'logo.svg',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png'
      ],
      manifest: {
        name: 'Align Japanese TTS',
        short_name: 'ja-align',
        description: 'Align Japanese Text and Audio',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,json,ogg,txt,woff2,zip,gz,wasm}'],
        maximumFileSizeToCacheInBytes: 100000000
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false
  }
}

export const devConfig: UserConfig = {
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false
  },
  optimizeDeps: { exclude: ['mecab-web-worker'] }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => (command === 'serve' ? devConfig : prodConfig))
