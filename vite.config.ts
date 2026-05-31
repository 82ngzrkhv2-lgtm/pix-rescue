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
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('--- PROXY REQUEST ---');
              console.log('URL:', req.url);
              console.log('HEADERS BEFORE STRIP:', proxyReq.getHeaders());
              
              // Strip browser-specific security and context headers to bypass Cloudflare bot/CSRF blocks
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              proxyReq.removeHeader('sec-fetch-site');
              proxyReq.removeHeader('sec-fetch-mode');
              proxyReq.removeHeader('sec-fetch-dest');
              proxyReq.removeHeader('sec-ch-ua');
              proxyReq.removeHeader('sec-ch-ua-mobile');
              proxyReq.removeHeader('sec-ch-ua-platform');
              
              console.log('HEADERS AFTER STRIP:', proxyReq.getHeaders());
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('--- PROXY RESPONSE ---');
              console.log('URL:', req.url);
              console.log('STATUS:', proxyRes.statusCode);
              console.log('HEADERS:', proxyRes.headers);
            });
          }
        }
      }
    }
  }
})
