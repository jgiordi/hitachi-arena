import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getCurrentPeriodLabel, getCurrentFYPrefix, getDaysLeftInFY, getDaysLeftInH1 } from './lib/fiscalYear'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import Leaderboard from './components/Leaderboard'
import BadgesPage from './components/BadgesPage'
import BreakdownPage from './components/BreakdownPage'
import ActivityFeed from './components/ActivityFeed'
import LogDealModal from './components/LogDealModal'
import AdminPanel from './components/AdminPanel'
import AppAdminPanel from './components/AppAdminPanel'

const ALLOWED_DOMAINS = ['hitachisolutions.com', 'hsdyn.com']

const SEGMENTS = ['UK Commercial', 'UK Government', 'France', 'Germany']

function RegionalKPIPanel({ currentUser }) {
  const [segmentData, setSegmentData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSegmentData() {
      const fyPrefix = getCurrentFYPrefix(new Date())
      
      // Fetch all sales reps with their segments
      const { data: salesReps } = await supabase
        .from('sales_reps')
        .select('id, segment')

      // Fetch all deals for current FY
      const { data: deals } = await supabase
        .from('deals')
        .select('rep_id, value, package_id')
        .like('period', fyPrefix + '%')

      if (!salesReps) {
        setLoading(false)
        return
      }

      // Create segment lookup
      const repSegment = {}
      salesReps.forEach(rep => {
        repSegment[rep.id] = rep.segment || 'UK Commercial'
      })

      // Aggregate by segment
      const data = {}
      SEGMENTS.forEach(seg => {
        data[seg] = { assessments: 0, pipeline: 0 }
      })

      if (deals) {
        deals.forEach(d => {
          const segment = repSegment[d.rep_id] || 'UK Commercial'
          if (data[segment]) {
            // Count cloud assessments
            if (d.package_id === 'cloud-assessment') {
              data[segment].assessments += 1
            }
            // Sum pipeline (all deal values)
            data[segment].pipeline += d.value || 0
          }
        })
      }

      setSegmentData(data)
      setLoading(false)
    }
    fetchSegmentData()
  }, [])

  const formatPipeline = (val) => {
    if (val >= 1000000) return '£' + (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return '£' + Math.round(val / 1000) + 'k'
    return '£' + val
  }

  if (loading) {
    return (
      <div style={styles.regionalGrid}>
        {SEGMENTS.map(seg => (
          <div key={seg} style={styles.regionalCard}>
            <div style={styles.regionalLabel}>{seg}</div>
            <div style={styles.regionalLoading}>Loading...</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={styles.regionalGrid}>
      {SEGMENTS.map(seg => (
        <div key={seg} style={styles.regionalCard}>
          <div style={styles.regionalLabel}>{seg}</div>
          <div style={styles.regionalMetrics}>
            <div style={styles.metricRow}>
              <span style={styles.metricLabel}>Cloud Assessments Sold</span>
              <span style={styles.metricValue}>{segmentData[seg]?.assessments || 0}</span>
            </div>
            <div style={styles.metricRow}>
              <span style={styles.metricLabel}>Pipeline Created (S2+)</span>
              <span style={styles.metricValue}>{formatPipeline(segmentData[seg]?.pipeline || 0)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DaysRemainingPanel() {
  const now = new Date()
  const daysLeftFY = getDaysLeftInFY(now)
  const daysLeftH1 = getDaysLeftInH1(now)

  return (
    <div style={styles.daysPanel}>
      <div style={styles.daysStat}>
        <div style={styles.daysValue}>{daysLeftH1}</div>
        <div style={styles.daysLabel}>Days Remaining in H1</div>
      </div>
      <div style={styles.daysDivider} />
      <div style={styles.daysStat}>
        <div style={styles.daysValue}>{daysLeftFY}</div>
        <div style={styles.daysLabel}>Days Remaining in FY</div>
      </div>
      <div style={styles.daysFooter}>
        As of 1 June · Figures uploaded monthly at the start of each month for the previous month
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authView, setAuthView] = useState('login') // 'login' | 'signup'
  const [tab, setTab] = useState('leaderboard')
  const [showLog, setShowLog] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [accountError, setAccountError] = useState(false)

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
      setAccountError(false)
      return
    }

    const email = session.user.email
    if (!ALLOWED_DOMAINS.some(d => email.endsWith('@' + d))) {
      await supabase.auth.signOut()
      return
    }

    setSession(session)

    const { data } = await supabase
      .from('reps')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!data) {
      // No rep record found — account was rejected or removed
      await supabase.auth.signOut()
      setAccountError(true)
      return
    }

    setCurrentUser(data)
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

  if (accountError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚫</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Account not found</div>
          <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '1.5rem' }}>
            Your account request may have been removed. Contact your admin for help.
          </div>
          <button style={styles.signOutBtn} onClick={() => setAccountError(false)}>Back to sign in</button>
        </div>
      </div>
    )
  }

  if (!session) {
    if (authView === 'signup') {
      return <SignUpPage onSwitchToLogin={() => setAuthView('login')} />
    }
    return <LoginPage onSwitchToSignUp={() => setAuthView('signup')} />
  }

  // Logged in but pending approval
  if (!currentUser?.approved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Awaiting approval</div>
          <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '1.5rem' }}>
            Your account is pending approval from an admin. Check back soon.
          </div>
          <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>
    )
  }

  const TAB_LABELS = { leaderboard: 'Leaderboard', breakdown: 'Breakdown', badges: 'Badges', admin: 'Admin', 'app-admin': 'App Admin' }
  const tabs = ['leaderboard', 'breakdown', 'badges', 'admin', ...(currentUser?.is_superuser ? ['app-admin'] : [])]

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
          <span style={styles.appName}>Hitachi Solutions Cloud Cup</span>
          <span style={styles.quarter}>{getCurrentPeriodLabel()}</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.logBtn} onClick={() => setShowLog(true)}>+ Log deal</button>
          <div style={styles.userInfo}>
            <div style={styles.userInitials}>{(currentUser?.name || session.user.email)[0].toUpperCase()}</div>
            <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        <RegionalKPIPanel currentUser={currentUser} />
        <DaysRemainingPanel />

        <div style={styles.tabs}>
          {tabs.map(t => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t] || t}
            </button>
          ))}
        </div>

        {tab === 'leaderboard' && (
          <>
            <Leaderboard currentUser={currentUser} />
            <ActivityFeed />
          </>
        )}
        {tab === 'breakdown' && <BreakdownPage />}
        {tab === 'badges' && <BadgesPage />}
        {tab === 'admin' && <AdminPanel currentUser={currentUser} />}
        {tab === 'app-admin' && currentUser?.is_superuser && <AppAdminPanel currentUser={currentUser} />}
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
  appName: { fontSize: '14px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.01em' },
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
  main: { maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' },
  // Regional KPI Panel styles
  regionalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '12px',
    marginBottom: '1rem',
  },
  regionalCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
  },
  regionalLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)',
  },
  regionalMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '11px',
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  metricValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  regionalLoading: {
    fontSize: '12px',
    color: 'var(--text3)',
    padding: '1rem 0',
    textAlign: 'center',
  },
  // Days Remaining Panel styles
  daysPanel: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.5rem',
    marginBottom: '1.5rem',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  daysStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  daysValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--red)',
  },
  daysLabel: {
    fontSize: '13px',
    color: 'var(--text2)',
    fontWeight: '500',
  },
  daysDivider: {
    width: '1px',
    height: '30px',
    background: 'var(--border-strong)',
  },
  daysFooter: {
    marginLeft: 'auto',
    fontSize: '10px',
    color: 'var(--text3)',
    fontStyle: 'italic',
  },
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
