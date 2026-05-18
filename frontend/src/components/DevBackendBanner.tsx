import { useEffect, useState } from 'react'
import './DevBackendBanner.css'

type Status = 'checking' | 'up' | 'down'

export function DevBackendBanner() {
  const [status, setStatus] = useState<Status>('checking')

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

  return (
    <div className="dev-backend-banner" role="alert">
      <strong>Backend not reachable.</strong> The UI proxies{' '}
      <code>/api</code> and <code>/ws</code> to Spring Boot on port{' '}
      <strong>8080</strong>. Start it in another terminal:
      <pre className="dev-backend-banner__cmd">
        cd backend{'\n'}
        .\mvnw.cmd spring-boot:run
      </pre>
      <span className="dev-backend-banner__hint">
        Then refresh this page. The <code>ECONNREFUSED</code> messages in the
        Vite terminal will stop once the API is up.
      </span>
    </div>
  )
}
