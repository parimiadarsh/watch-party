import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import { isGoogleConfigured, signInWithGoogleCredential } from '../lib/accountApi'
import './GoogleSignInButton.css'

type Props = {
  onSuccess?: () => void
  /** Use a smaller footprint for toolbars */
  compact?: boolean
}

export function GoogleSignInButton({ onSuccess, compact = false }: Props) {
  const [error, setError] = useState<string | null>(null)

  if (!isGoogleConfigured()) {
    return null
  }

  const handleSuccess = async (c: CredentialResponse) => {
    if (!c.credential) return
    try {
      setError(null)
      await signInWithGoogleCredential(c.credential)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    }
  }

  return (
    <div className={`google-signin${compact ? ' google-signin--compact' : ''}`}>
      <GoogleLogin
        onSuccess={(c) => void handleSuccess(c)}
        onError={() => setError('Google sign-in failed or was dismissed.')}
        useOneTap={false}
        text="signin_with"
        shape="rectangular"
        theme="outline"
        size={compact ? 'medium' : 'large'}
        width={compact ? '200' : '280'}
      />
      {error && (
        <p className="google-signin__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
