import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY || 'http://localhost:8080'

  const onProxyError = (label: string) => (err: NodeJS.ErrnoException) => {
    if (err.code === 'ECONNREFUSED') {
      console.warn(
        `[vite] ${label} proxy → ${apiProxyTarget} refused connection. ` +
          'Start Spring Boot: cd backend && .\\mvnw.cmd spring-boot:run',
      )
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', onProxyError('HTTP /api'))
          },
        },
        '/ws': {
          target: apiProxyTarget,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', onProxyError('WebSocket /ws'))
          },
        },
      },
    },
  }
})
