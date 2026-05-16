import { createServer } from 'http'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const port = Number(process.env.PORT) || 3001
const springBaseUrl = process.env.SPRING_BOOT_URL || 'http://localhost:8080'

const app = express()

const apiProxy = createProxyMiddleware({
  target: springBaseUrl,
  changeOrigin: true,
})

const wsProxy = createProxyMiddleware({
  target: springBaseUrl,
  changeOrigin: true,
  ws: true,
})

app.use('/api', apiProxy)
app.use('/ws', wsProxy)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', proxyTarget: springBaseUrl })
})

const server = createServer(app)
server.on('upgrade', wsProxy.upgrade)

server.listen(port, () => {
  console.log(`Middleware http://localhost:${port} → ${springBaseUrl} (HTTP + /ws upgrade)`)
})
