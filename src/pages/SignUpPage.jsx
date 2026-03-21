import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ALLOWED_DOMAIN = 'hitachisolutions.com'

export default function SignUpPage({ onSwitchToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSignUp(e) {
    e.preventDefault()
    setError(null)

    if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are permitted.`)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { error: repError } = await supabase.from('reps').insert({
      id: data.user.id,
      name: name.trim() || email.split('@')[0],
      email,
      approved: false,
    })

    if (repError) {
      setError(repError.message)
      setLoading(false)
      return
    }

    // Sign out immediately — user must wait for approval before accessing the app
    await supabase.auth.signOut()
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <LogoRow />
          <div style={styles.icon}>⏳</div>
          <h1 style={styles.h1}>Request submitted</h1>
          <p style={styles.sub}>
            Your account is pending approval. You'll be able to sign in once an admin approves your request.
          </p>
          <button style={styles.backBtn} onClick={onSwitchToLogin}>Back to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <LogoRow />
        <h1 style={styles.h1}>Request access</h1>
        <p style={styles.sub}>
          Sign up with your Hitachi Solutions email. An admin will approve your request before you can log in.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSignUp}>
          <div style={styles.field}>
            <label style={styles.label}>Full name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Sarah Khan"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@hitachisolutions.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Min. 8 characters"
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
            {loading ? 'Submitting...' : 'Request access'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <button style={styles.switchLink} onClick={onSwitchToLogin}>Sign in</button>
        </p>
      </div>
    </div>
  )
}

function LogoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.75rem' }}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect width="22" height="22" rx="5" fill="#d32927"/>
        <text x="11" y="15.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="DM Sans, sans-serif">H</text>
      </svg>
      <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.01em' }}>Sales Arena</span>
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
  icon: { fontSize: '32px', marginBottom: '12px' },
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
  backBtn: {
    width: '100%',
    padding: '11px',
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  switchText: { fontSize: '13px', color: 'var(--text3)', textAlign: 'center' },
  switchLink: { background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
}
