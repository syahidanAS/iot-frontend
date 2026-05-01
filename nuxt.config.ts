// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api',
      mqttHost: process.env.NUXT_PUBLIC_MQTT_HOST || 'wss://mqtt.unilog.my.id/mqtt',
    },
  },

  // =====================
  // PWA CONFIG
  // =====================
  pwa: {
    registerType: 'autoUpdate',

    manifest: {
      name: 'SmartControl',
      short_name: 'IoT',
      description: 'IoT Monitoring & Control System',
      theme_color: '#e0e5ec',
      background_color: '#e0e5ec',
      display: 'standalone',
      start_url: '/',

      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },

    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true
    },

    devOptions: {
      enabled: false // jangan true di production
    }
  }
})