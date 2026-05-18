import { useEffect, useState, type ReactNode } from 'react'
import { THEME_BACKGROUNDS, THEME_ROTATION_MS } from '../lib/themeImages'
import './ThemeShell.css'

type Props = {
  children: ReactNode
  /** Lock to one viewport (welcome / lobby) — no page scroll */
  fitViewport?: boolean
}

export function ThemeShell({ children, fitViewport = false }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (THEME_BACKGROUNDS.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % THEME_BACKGROUNDS.length)
    }, THEME_ROTATION_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className={`theme-shell${fitViewport ? ' theme-shell--fit' : ''}`}
    >
      <div className="theme-shell__backdrop" aria-hidden>
        <div className="theme-shell__hero">
          {THEME_BACKGROUNDS.map((url, index) => (
            <img
              key={url}
              src={url}
              alt=""
              draggable={false}
              decoding="async"
              className={
                index === activeIndex ? 'theme-shell__slide is-active' : 'theme-shell__slide'
              }
            />
          ))}
        </div>
        <div className="theme-shell__veil" />
        <div className="theme-shell__glow theme-shell__glow--red" />
      </div>

      <div className="theme-shell__content">{children}</div>
    </div>
  )
}
