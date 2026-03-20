import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const MEDAL_COLOR = { 1: '#c8961e', 2: '#6b7280', 3: '#92400e' }

function Avatar({ name, avatarUrl, size = 36 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const colors = [
    ['#E6F1FB', '#185FA5'], ['#E1F5EE', '#0F6E56'],
    ['#FAEEDA', '#854F0B'], ['#EEEDFE', '#534AB7'],
    ['#FBEAF0', '#993556'], ['#EAF3DE', '#3B6D11'],
  ]
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  const [bg, fg] = colors[idx]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: '600', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function Badge({ label, color }) {
  const colors = {
    red: { bg: '#fef2f2', text: '#b91c1c' },
    amber: { bg: '#fefce8', text: '#92400e' },
    green: { bg: '#f0fdf4', text: '#166534' },
    blue: { bg: '#eff6ff', text: '#1d4ed8' },
    purple: { bg: '#f5f3ff', text: '#6d28d9' },
  }
  const c = colors[color] || colors.blue
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: '10px', fontWeight: '500',
      padding: '2px 7px', borderRadius: '99px',
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function getBadges(rep) {
  const badges = []
  if (rep.deals_count >= 5) badges.push({ label: 'cloud ace', color: 'blue' })
  if (rep.streak >= 5) badges.push({ label: `streak ×${rep.streak}`, color: 'red' })
  if (rep.is_new_this_quarter) badges.push({ label: 'rising star', color: 'green' })
  if (rep.total_revenue >= 500000) badges.push({ label: 'enterprise', color: 'purple' })
  return badges
}

export default function Leaderboard({ currentUser }) {
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('quarter')

  async function fetchLeaderboard() {
    setLoading(true)

    // First fetch all sales_reps
    const { data: salesReps } = await supabase
      .from('sales_reps')
      .select('*')
      .order('name')

    if (!salesReps || salesReps.length === 0) {
      setReps([])
      setLoading(false)
      return
    }

    // Then fetch deals with optional period filter
    let query = supabase.from('deals').select('rep_id, value, points_earned, period, month')

    if (period === 'quarter') {
      query = query.eq('period', getCurrentQuarter())
    } else if (period === 'month') {
      query = query.eq('month', getCurrentMonth())
    }

    const { data: deals } = await query

    // Aggregate deals per rep
    const dealMap = {}
    if (deals) {
      deals.forEach(d => {
        if (!dealMap[d.rep_id]) dealMap[d.rep_id] = { deals_count: 0, total_revenue: 0, points: 0 }
        dealMap[d.rep_id].deals_count += 1
        dealMap[d.rep_id].total_revenue += d.value || 0
        dealMap[d.rep_id].points += d.points_earned || 0
      })
    }

    // Merge reps with their stats, sort by points
    const merged = salesReps.map(rep => ({
      id: rep.id,
      name: rep.name,
      avatar_url: rep.avatar_url,
      job_title: rep.job_title,
      deals_count: dealMap[rep.id]?.deals_count || 0,
      total_revenue: dealMap[rep.id]?.total_revenue || 0,
      points: dealMap[rep.id]?.points || 0,
      streak: 0,
      is_new_this_quarter: false,
    })).sort((a, b) => b.points - a.points)

    setReps(merged)
    setLoading(false)
  }

  function getCurrentQuarter() {
    const m = new Date().getMonth()
    return `Q${Math.floor(m / 3) + 1}-${new Date().getFullYear()}`
  }

  function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7)
  }

  function aggregateDeals(deals) {
    const map = {}
    deals.forEach(d => {
      const rep = d.reps
      if (!rep) return
      if (!map[rep.id]) {
        map[rep.id] = {
          id: rep.id,
          name: rep.name,
          avatar_url: rep.avatar_url,
          deals_count: 0,
          total_revenue: 0,
          points: 0,
          streak: 0,
          is_new_this_quarter: false,
        }
      }
      map[rep.id].deals_count += 1
      map[rep.id].total_revenue += d.value || 0
      map[rep.id].points += d.points_earned || 0
    })
    return Object.values(map).sort((a, b) => b.points - a.points)
  }

  useEffect(() => {
    fetchLeaderboard()

    // real-time subscription
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [period])

  const maxPoints = reps[0]?.points || 1

  return (
    <div>
      <div style={styles.toolbar}>
        <h2 style={styles.sectionTitle}>Leaderboard</h2>
        <div style={styles.toggle}>
          {['quarter', 'month', 'all'].map(p => (
            <button
              key={p}
              style={{ ...styles.toggleBtn, ...(period === p ? styles.toggleActive : {}) }}
              onClick={() => setPeriod(p)}
            >
              {p === 'quarter' ? 'This quarter' : p === 'month' ? 'This month' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : reps.length === 0 ? (
        <div style={styles.empty}>No deals logged yet. Be the first! 🚀</div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={{gridColumn: '1'}}>Rank</span>
            <span style={{gridColumn: '2'}}>Rep</span>
            <span style={{gridColumn: '3', textAlign: 'center'}}>Deals</span>
            <span style={{gridColumn: '4', textAlign: 'right'}}>Revenue</span>
            <span style={{gridColumn: '5', textAlign: 'right'}}>Points</span>
          </div>

          {reps.map((rep, i) => {
            const rank = i + 1
            const isMe = currentUser?.id === rep.id
            const badges = getBadges(rep)
            const barWidth = Math.round((rep.points / maxPoints) * 100)

            return (
              <div
                key={rep.id}
                style={{
                  ...styles.row,
                  ...(isMe ? styles.rowMe : {}),
                }}
              >
                <div style={{ ...styles.rank, color: MEDAL_COLOR[rank] || 'var(--text3)' }}>
                  {MEDAL[rank] || rank}
                </div>

                <div style={styles.person}>
                  <Avatar name={rep.name} avatarUrl={rep.avatar_url} />
                  <div>
                    <div style={styles.name}>
                      {rep.name}
                      {isMe && <span style={styles.youBadge}>you</span>}
                    </div>
                    {badges.length > 0 && (
                      <div style={styles.badges}>
                        {badges.map(b => <Badge key={b.label} {...b} />)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.deals}>{rep.deals_count}</div>

                <div style={styles.revenue}>
                  £{rep.total_revenue >= 1000000
                    ? (rep.total_revenue / 1000000).toFixed(1) + 'M'
                    : rep.total_revenue >= 1000
                    ? Math.round(rep.total_revenue / 1000) + 'k'
                    : rep.total_revenue}
                </div>

                <div style={styles.pointsCell}>
                  <div style={styles.pts}>{rep.points.toLocaleString()}</div>
                  <div style={styles.barWrap}>
                    <div style={{ ...styles.bar, width: `${barWidth}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  toggle: {
    display: 'flex',
    background: 'var(--surface2)',
    borderRadius: '8px',
    padding: '3px',
    gap: '2px',
  },
  toggleBtn: {
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text2)',
    borderRadius: '6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  toggleActive: {
    background: 'var(--surface)',
    color: 'var(--text)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  loading: { padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' },
  empty: { padding: '3rem', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' },
  table: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr 70px 90px 110px',
    gap: '8px',
    padding: '10px 16px',
    background: 'var(--surface2)',
    fontSize: '11px',
    color: 'var(--text3)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr 70px 90px 110px',
    gap: '8px',
    padding: '12px 16px',
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
    transition: 'background 0.1s',
  },
  rowMe: {
    background: '#fef9f9',
    borderLeft: '3px solid var(--red)',
  },
  rank: {
    fontSize: '15px',
    textAlign: 'center',
    fontWeight: '500',
  },
  person: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  youBadge: {
    fontSize: '10px',
    background: 'var(--red-light)',
    color: 'var(--red)',
    padding: '1px 6px',
    borderRadius: '99px',
    fontWeight: '500',
  },
  badges: {
    display: 'flex',
    gap: '4px',
    marginTop: '3px',
    flexWrap: 'wrap',
  },
  deals: {
    fontSize: '14px',
    color: 'var(--text)',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  revenue: {
    fontSize: '13px',
    color: 'var(--text2)',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  pointsCell: { textAlign: 'right' },
  pts: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--red)',
    fontVariantNumeric: 'tabular-nums',
  },
  barWrap: {
    height: '3px',
    background: 'var(--border)',
    borderRadius: '2px',
    marginTop: '4px',
  },
  bar: {
    height: '3px',
    background: 'var(--red)',
    borderRadius: '2px',
    opacity: 0.6,
    transition: 'width 0.5s ease',
  },
}
