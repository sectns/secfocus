import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      manifest: {
        name: 'SecFocus OS',
        short_name: 'SecFocus',
        theme_color: '#10b981',
        background_color: '#000000',
        display: 'standalone',
        icons: [{ src: 'https://cdn-icons-png.flaticon.com/512/906/906324.png', sizes: '192x192', type: 'image/png' }]
      }
    })
  ]
})
