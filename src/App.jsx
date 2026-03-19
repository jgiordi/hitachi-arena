import { useState, useEffect } from 'react'
import { supabase, ALLOWED_DOMAIN } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import Leaderboard from './components/Leaderboard'
import PackagesPage from './components/PackagesPage'
import ActivityFeed from './components/ActivityFeed'
import LogDealModal from './components/LogDealModal'

function StatsBar({ currentUser }) {
  const [stats, setStats] = useState({ total_deals: 0, total_revenue: 0, days_left: 0, top_name: '' })

  useEffect(() => {
    async function fetchStats() {
      const now = new Date()
      const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`

      // Quarter end date
      const quarterEndMonth = Math.floor(now.getMonth() / 3) * 3 + 2
      const quarterEnd = new Date(now.getFullYear(), quarterEndMonth + 1, 0)
      const daysLeft = Math.max(0, Math.ceil((quarterEnd - now) / (1000 * 60 * 60 * 24)))

      const { data: deals } = await supabase
        .from('deals')
        .select('value, points_earned, reps(name)')
        .eq('period', quarter)

      if (deals && deals.length > 0) {
        const totalDeals = deals.length
        const totalRevenue = deals.reduce((sum, d) => sum + (d.value || 0), 0)

        // find top rep by points
        const repPoints = {}
        deals.forEach(d => {
          const name = d.reps?.name || 'Unknown'
          repPoints[name] = (repPoints[name] || 0) + (d.points_earned || 0)
        })
        const topName = Object.entries(repPoints).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

        setStats({ total_deals: totalDeals, total_revenue: totalRevenue, days_left: daysLeft, top_name: topName })
      } else {
        setStats(s => ({ ...s, days_left: daysLeft }))
      }
    }
    fetchStats()
  }, [])

  const revenueStr = stats.total_revenue >= 1000000
    ? '£' + (stats.total_revenue / 1000000).toFixed(1) + 'M'
    : stats.total_revenue >= 1000
    ? '£' + Math.round(stats.total_revenue / 1000) + 'k'
    : '£' + stats.total_revenue

  return (
    <div style={styles.statsGrid}>
      <div style={styles.stat}><div style={styles.statLabel}>Deals closed</div><div style={styles.statVal}>{stats.total_deals}</div><div style={styles.statSub}>this quarter</div></div>
      <div style={styles.stat}><div style={styles.statLabel}>Top earner</div><div style={styles.statVal}>{stats.top_name || '—'}</div><div style={styles.statSub}>leading the board</div></div>
      <div style={styles.stat}><div style={styles.statLabel}>Revenue unlocked</div><div style={styles.statVal}>{revenueStr}</div><div style={styles.statSub}>quarter total</div></div>
      <div style={styles.stat}><div style={styles.statLabel}>Days remaining</div><div style={styles.statVal}>{stats.days_left}</div><div style={styles.statSub}>in this quarter</div></div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [wrongDomain, setWrongDomain] = useState(false)
  const [tab, setTab] = useState('leaderboard')
  const [showLog, setShowLog] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSession(session) {
    if (!session) {
      setSession(null)
      setCurrentUser(null)
      return
    }

    const email = session.user.email
    if (ALLOWED_DOMAIN && !email.endsWith('@' + ALLOWED_DOMAIN)) {
      await supabase.auth.signOut()
      setWrongDomain(true)
      return
    }

    setSession(session)
    setWrongDomain(false)

    // Upsert rep profile
    const { data } = await supabase
      .from('reps')
      .upsert({
        id: session.user.id,
        name: session.user.user_metadata.full_name || email.split('@')[0],
        email,
        avatar_url: session.user.user_metadata.avatar_url || null,
      }, { onConflict: 'id' })
      .select()
      .single()

    setCurrentUser(data || { id: session.user.id, name: session.user.user_metadata.full_name, email })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  if (wrongDomain) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚫</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Access restricted</div>
          <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '1.5rem' }}>
            Only <strong>@{ALLOWED_DOMAIN}</strong> accounts can access Sales Arena.
          </div>
          <button style={styles.signOutBtn} onClick={() => { setWrongDomain(false) }}>Try again</button>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage />

  return (
    <div style={styles.app}>
      {/* Top nav */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="5" fill="#d32927"/>
              <text x="11" y="15.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="DM Sans, sans-serif">H</text>
            </svg>
          </div>
          <span style={styles.appName}>Sales Arena</span>
          <span style={styles.quarter}>Q{Math.floor(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.logBtn} onClick={() => setShowLog(true)}>+ Log deal</button>
          <div style={styles.userInfo}>
            {session.user.user_metadata.avatar_url
              ? <img src={session.user.user_metadata.avatar_url} alt="" style={styles.userAvatar} />
              : <div style={styles.userInitials}>{(session.user.user_metadata.full_name || session.user.email)[0].toUpperCase()}</div>
            }
            <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        <StatsBar currentUser={currentUser} />

        <div style={styles.tabs}>
          {['leaderboard', 'packages'].map(t => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'leaderboard' && (
          <>
            <Leaderboard currentUser={currentUser} />
            <ActivityFeed />
          </>
        )}
        {tab === 'packages' && <PackagesPage />}
      </main>

      {showLog && <LogDealModal onClose={() => setShowLog(false)} currentUser={currentUser} />}
    </div>
  )
}

const styles = {
  app: { minHeight: '100vh', background: 'var(--bg)' },
  header: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    padding: '0 1.5rem',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: { lineHeight: 0 },
  appName: { fontSize: '15px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.01em' },
  quarter: {
    fontSize: '12px',
    color: 'var(--text3)',
    background: 'var(--surface2)',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  logBtn: {
    padding: '7px 14px',
    background: 'var(--red)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  userAvatar: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' },
  userInitials: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--surface2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text2)',
  },
  signOutBtn: {
    fontSize: '13px',
    color: 'var(--text3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  main: { maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '12px',
    marginBottom: '1.5rem',
  },
  stat: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
  },
  statLabel: { fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
  statVal: { fontSize: '20px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.02em' },
  statSub: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '1.25rem',
    borderBottom: '1px solid var(--border)',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text3)',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    cursor: 'pointer',
  },
  tabActive: {
    color: 'var(--red)',
    borderBottomColor: 'var(--red)',
  },
}
