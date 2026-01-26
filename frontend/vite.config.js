import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:8000'
  const targetIsNgrok = proxyTarget.includes('ngrok')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      allowedHosts: ['ab68163a464b.ngrok-free.app'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: targetIsNgrok
            ? (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('ngrok-skip-browser-warning', 'true')
                })
              }
            : undefined,
        },
      },
    },
  }
})
