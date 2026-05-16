import { useState } from 'react'
import { Lobby } from './components/Lobby'
import { RoomView } from './components/RoomView'
import './App.css'

type Session = { roomId: string; displayName: string }

function App() {
  const [session, setSession] = useState<Session | null>(null)

  if (!session) {
    return (
      <main className="app">
        <Lobby
          onJoin={(roomId, displayName) => setSession({ roomId, displayName })}
        />
      </main>
    )
  }

  return (
    <main className="app">
      <RoomView
        roomId={session.roomId}
        displayName={session.displayName}
        onLeave={() => setSession(null)}
      />
    </main>
  )
}

export default App
