import { useState } from 'react'
import { Lobby } from './components/Lobby'
import { RoomView } from './components/RoomView'
import { WelcomePage } from './components/WelcomePage'
import { DevBackendBanner } from './components/DevBackendBanner'
import { ThemeShell } from './components/ThemeShell'
import {
  clearEntry,
  clearSession,
  isGoogleConfigured,
  shouldSkipWelcome,
} from './lib/accountApi'
import { googleLogout } from '@react-oauth/google'
import './App.css'

type RoomSession = { roomId: string; displayName: string }

type Screen = 'welcome' | 'lobby'

function initialScreen(): Screen {
  return shouldSkipWelcome() ? 'lobby' : 'welcome'
}

function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [roomSession, setRoomSession] = useState<RoomSession | null>(null)

  const returnToWelcome = () => {
    if (isGoogleConfigured()) {
      googleLogout()
    }
    clearSession()
    clearEntry()
    setScreen('welcome')
  }

  const handleSignOut = () => {
    setRoomSession(null)
    returnToWelcome()
  }

  if (roomSession) {
    return (
      <ThemeShell>
        {import.meta.env.DEV && <DevBackendBanner />}
        <main className="app app--room">
          <RoomView
            roomId={roomSession.roomId}
            displayName={roomSession.displayName}
            onLeave={() => setRoomSession(null)}
            onSignOut={handleSignOut}
          />
        </main>
      </ThemeShell>
    )
  }

  if (screen === 'welcome') {
    return (
      <ThemeShell fitViewport>
        {import.meta.env.DEV && <DevBackendBanner />}
        <main className="app app--welcome app--fit">
          <WelcomePage onContinue={() => setScreen('lobby')} />
        </main>
      </ThemeShell>
    )
  }

  return (
    <ThemeShell fitViewport>
      {import.meta.env.DEV && <DevBackendBanner />}
      <main className="app app--fit">
        <Lobby
          onJoin={(roomId, displayName) =>
            setRoomSession({ roomId, displayName })
          }
          onBack={returnToWelcome}
        />
      </main>
    </ThemeShell>
  )
}

export default App
