import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const evolutionUrl = env.VITE_EVOLUTION_API_URL || 'https://magicalsunbear-evolution.cloudfy.live'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/evolution-api': {
          target: evolutionUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/evolution-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          }
        }
      }
    }
  }
})
