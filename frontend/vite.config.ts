import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Use 127.0.0.1 — on Windows, `localhost` in Node can mean IPv6 (::1) while Java listens on IPv4 */
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8080'

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
      /**
       * Bind IPv4 on all interfaces (127.0.0.1, LAN, Tailscale).
       * `host: true` alone can leave only IPv6 (::1) on Windows, so localhost
       * works while http://127.0.0.1:5173 does not.
       */
      host: '0.0.0.0',
      allowedHosts: ['localhost', '127.0.0.1', '.ts.net'],
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
