import { useEffect, useState } from 'react'
import './DevBackendBanner.css'

type Status = 'checking' | 'up' | 'down'

function isLocalDevHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

export function DevBackendBanner() {
  const [status, setStatus] = useState<Status>('checking')
  const [isHost, setIsHost] = useState(true)

  useEffect(() => {
    setIsHost(isLocalDevHost(window.location.hostname))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/hello', { signal: AbortSignal.timeout(4000) })
        if (!cancelled) {
          setStatus(res.ok ? 'up' : 'down')
        }
      } catch {
        if (!cancelled) {
          setStatus('down')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (status !== 'down') {
    return null
  }

  if (!isHost) {
    return (
      <div className="dev-backend-banner" role="alert">
        <strong>Backend not reachable on the host machine.</strong> This site is
        served from someone else&apos;s PC over Tailscale (or LAN). The room
        host must run <strong>both</strong> the frontend and Spring Boot on{' '}
        <strong>their</strong> computer:
        <pre className="dev-backend-banner__cmd">
          cd backend{'\n'}
          .\mvnw.cmd spring-boot:run
        </pre>
        <pre className="dev-backend-banner__cmd">
          cd frontend{'\n'}
          npm run dev
        </pre>
        <span className="dev-backend-banner__hint">
          Ask them to confirm http://localhost:5173 works without this banner,
          then share the Tailscale link again. You cannot fix this from your
          browser alone.
        </span>
      </div>
    )
  }

  return (
    <div className="dev-backend-banner" role="alert">
      <strong>Backend not reachable.</strong> Teammates using your Tailscale link
      need Spring Boot running on <strong>this</strong> PC. The UI proxies{' '}
      <code>/api</code> and <code>/ws</code> to port <strong>8080</strong>. Start
      it in another terminal:
      <pre className="dev-backend-banner__cmd">
        cd backend{'\n'}
        .\mvnw.cmd spring-boot:run
      </pre>
      <span className="dev-backend-banner__hint">
        Keep <code>npm run dev</code> running too. Then refresh —{' '}
        <code>ECONNREFUSED</code> in the Vite terminal should stop. Test:{' '}
        <a href="http://127.0.0.1:8080/api/hello" target="_blank" rel="noreferrer">
          http://127.0.0.1:8080/api/hello
        </a>
      </span>
    </div>
  )
}
