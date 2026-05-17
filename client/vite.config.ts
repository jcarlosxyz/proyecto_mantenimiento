import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Plugin: copia logo_inicio.jpg desde la raiz del proyecto a public/
function copyLogoPlugin() {
  const src  = resolve(__dirname, '../logo_inicio.jpg')
  const dest = resolve(__dirname, 'public/logo_inicio.jpg')

  const tryCopy = () => {
    if (existsSync(src)) {
      copyFileSync(src, dest)
      console.log('[vite] logo_inicio.jpg copiado a public/')
    } else {
      console.warn('[vite] AVISO: no se encontro logo_inicio.jpg en', src)
    }
  }

  return {
    name: 'copy-logo',
    // Se ejecuta al iniciar el build
    buildStart: tryCopy,
    // Se ejecuta al iniciar el dev server
    configureServer: tryCopy,
  }
}

export default defineConfig({
  plugins: [react(), copyLogoPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
