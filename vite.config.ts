import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const requestedBase = env.VITE_BASE_PATH || '/'
  const base = requestedBase === '/'
    ? '/'
    : `/${requestedBase.replace(/^\/+|\/+$/g, '')}/`

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: '小月历 · 生理期日历',
          short_name: '小月历',
          description: '记录经期，了解自己的周期。数据仅保存在本机。',
          lang: 'zh-CN',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#fbf7f6',
          theme_color: '#fbf7f6',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
          ]
        },
        workbox: {
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
          cleanupOutdatedCaches: true
        }
      })
    ]
  }
})
