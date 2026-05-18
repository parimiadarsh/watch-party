import { isGoogleConfigured, setGuestEntry } from '../lib/accountApi'
import { GoogleSignInButton } from './GoogleSignInButton'
import './WelcomePage.css'

type Props = {
  onContinue: () => void
}

export function WelcomePage({ onContinue }: Props) {
  const googleEnabled = isGoogleConfigured()

  const continueAsGuest = () => {
    setGuestEntry()
    onContinue()
  }

  return (
    <div className="welcome">
      <header className="welcome__header">
        <p className="eyebrow">K-Drama · C-Drama · Anime</p>
        <h1>Your watch party awaits</h1>
        <p className="welcome__lede">
          Binge together with synced playback, screen share, and live chat —
          whether you are chasing the latest K-drama, a C-drama epic, or the
          season&apos;s hottest anime.
        </p>
      </header>

      <div className="welcome__card glass-card glass-card--strong">
        {googleEnabled ? (
          <>
            <div className="welcome__google">
              <p className="welcome__option-label">Sign in with Google</p>
              <p className="welcome__option-hint">
                Save your rooms and jump back in after the cliffhanger.
              </p>
              <div className="welcome__google-btn">
                <GoogleSignInButton onSuccess={onContinue} />
              </div>
            </div>

            <div className="welcome__divider" aria-hidden="true">
              <span>or</span>
            </div>

            <button
              type="button"
              className="btn welcome__guest"
              onClick={continueAsGuest}
            >
              Continue as guest
            </button>
            <p className="welcome__guest-hint muted">
              No account — room ids are not saved when you close the browser.
            </p>
          </>
        ) : (
          <>
            <p className="welcome__hint muted">
              Google sign-in is not configured. You can still join as a guest.
            </p>
            <button
              type="button"
              className="btn primary welcome__guest-only"
              onClick={continueAsGuest}
            >
              Continue as guest
            </button>
          </>
        )}
      </div>
    </div>
  )
}
