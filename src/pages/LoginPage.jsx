import { useState } from 'react'
import { supabase, ALLOWED_DOMAIN } from '../lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          hd: ALLOWED_DOMAIN, // hints Google to show only company accounts
        },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="5" fill="#d32927"/>
              <text x="11" y="15.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="DM Sans, sans-serif">H</text>
            </svg>
          </div>
          <span style={styles.logoText}>Sales Arena</span>
        </div>

        <h1 style={styles.h1}>Welcome back</h1>
        <p style={styles.sub}>Sign in with your Hitachi Solutions Google account to access the leaderboard.</p>

        {error && <div style={styles.error}>{error}</div>}

        <button style={{...styles.googleBtn, opacity: loading ? 0.7 : 1}} onClick={handleGoogleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <p style={styles.hint}>Only <strong>@{ALLOWED_DOMAIN}</strong> accounts are permitted.</p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '1rem',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: 'var(--shadow-md)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '1.75rem',
  },
  logo: { lineHeight: 0 },
  logoText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  h1: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  sub: {
    fontSize: '14px',
    color: 'var(--text2)',
    lineHeight: '1.6',
    marginBottom: '1.75rem',
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '1rem',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '11px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text)',
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginBottom: '1.25rem',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text3)',
    textAlign: 'center',
  },
}
