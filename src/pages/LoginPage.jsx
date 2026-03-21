import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage({ onSwitchToSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
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
        <p style={styles.sub}>Sign in with your Hitachi Solutions account.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSignIn}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@hitachisolutions.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <button style={styles.switchLink} onClick={onSwitchToSignUp}>Request access</button>
        </p>
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
  logoRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.75rem' },
  logo: { lineHeight: 0 },
  logoText: { fontSize: '16px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.01em' },
  h1: { fontSize: '22px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.02em' },
  sub: { fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '1.75rem' },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '1rem',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' },
  label: { fontSize: '11px', fontWeight: '500', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    padding: '10px 12px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '11px',
    background: 'var(--red)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.25rem',
    marginBottom: '1.25rem',
  },
  switchText: { fontSize: '13px', color: 'var(--text3)', textAlign: 'center' },
  switchLink: { background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
}
