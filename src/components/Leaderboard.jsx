import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentFYPrefix, getPrevFYPrefix, getPrevFYYear, getFYYear } from '../lib/fiscalYear'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const MEDAL_COLOR = { 1: '#c8961e', 2: '#6b7280', 3: '#92400e' }

const SEGMENT_FLAG = {
  'UK Commercial': '🇬🇧',
  'UK Government': '🇬🇧',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'LTS': '🌐',
}

const SEGMENT_LABELS = {
  'UK Commercial': 'UK Commercial',
  'UK Government': 'UK Government',
  'France': 'FR',
  'Germany': 'DE',
  'LTS': 'LTS',
}

// Badge emojis based on achievements
const BADGE_ICONS = {
  quarterStar: '⭐',
  cloudAce: '☁️',
  hunter: '🎯',
  portfolioPro: '📊',
  fireStreak: '🔥',
}

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

function calculateBadges(rep, allDeals) {
  const badges = []
  const repDeals = allDeals.filter(d => d.rep_id === rep.id && d.package_id === 'cloud-assessment')
  
  // Fire Streak: 2+ deals in same quarter
  const quarterCounts = {}
  repDeals.forEach(d => {
    const quarter = d.period
    quarterCounts[quarter] = (quarterCounts[quarter] || 0) + 1
  })
  if (Object.values(quarterCounts).some(c => c >= 2)) {
    badges.push(BADGE_ICONS.fireStreak)
  }
  
  // Portfolio Pro: Multiple assessments same account
  const accountCounts = {}
  repDeals.forEach(d => {
    const account = d.account_id || d.client_name || 'unknown'
    accountCounts[account] = (accountCounts[account] || 0) + 1
  })
  if (Object.values(accountCounts).some(c => c >= 2)) {
    badges.push(BADGE_ICONS.portfolioPro)
  }
  
  // Hunter: Net new logo
  if (allDeals.filter(d => d.rep_id === rep.id && d.is_net_new).length > 0) {
    badges.push(BADGE_ICONS.hunter)
  }
  
  return badges
}

export default function Leaderboard({ currentUser }) {
  const [reps, setReps] = useState([])
  const [allDeals, setAllDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('fy')
  const [showAll, setShowAll] = useState(false)
  
  const INITIAL_DISPLAY = 8

  async function fetchLeaderboard() {
    setLoading(true)
    const currentFY = getFYYear()
    const prevFY = getPrevFYYear()

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

    // Fetch all deals (we need all for badge calculation)
    const { data: allDealsData } = await supabase.from('deals').select('*')
    setAllDeals(allDealsData || [])

    // Filter deals based on period selection
    let filteredDeals = allDealsData || []
    if (period === 'fy') {
      filteredDeals = filteredDeals.filter(d => d.period?.startsWith(`FY${currentFY}-`))
    } else if (period === 'prev-fy') {
      filteredDeals = filteredDeals.filter(d => d.period?.startsWith(`FY${prevFY}-`))
    }

    // Aggregate deals per rep
    const dealMap = {}
    filteredDeals.forEach(d => {
      if (!dealMap[d.rep_id]) dealMap[d.rep_id] = { 
        assessments: 0, 
        pipeline: 0, 
        points: 0 
      }
      // Count cloud assessments only for deals column
      if (d.package_id === 'cloud-assessment') {
        dealMap[d.rep_id].assessments += 1
      }
      // Sum pipeline (all deal values)
      dealMap[d.rep_id].pipeline += d.value || 0
      // Sum points
      dealMap[d.rep_id].points += d.points_earned || 0
    })

    // Merge reps with their stats
    const merged = salesReps.map(rep => ({
      id: rep.id,
      name: rep.name,
      avatar_url: rep.avatar_url,
      segment: rep.segment || 'UK Commercial',
      assessments: dealMap[rep.id]?.assessments || 0,
      pipeline: dealMap[rep.id]?.pipeline || 0,
      points: dealMap[rep.id]?.points || 0,
      badges: calculateBadges(rep, allDealsData || []),
    }))

    // Sort: by points descending, then alphabetically for those with 0 points
    merged.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return a.name.localeCompare(b.name)
    })

    setReps(merged)
    setLoading(false)
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
  const displayedReps = showAll ? reps : reps.slice(0, INITIAL_DISPLAY)
  const hasMore = reps.length > INITIAL_DISPLAY

  const formatPipeline = (val) => {
    if (val >= 1000000) return '£' + (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return '£' + Math.round(val / 1000) + 'k'
    return '£' + val
  }

  // Check if we're viewing FY25 (previous year) - points should be greyed out
  const isPrevFY = period === 'prev-fy'

  return (
    <div>
      <div style={styles.toolbar}>
        <h2 style={styles.sectionTitle}>Leaderboard</h2>
        <div style={styles.toggle}>
          {['fy', 'prev-fy'].map(p => (
            <button
              key={p}
              style={{ ...styles.toggleBtn, ...(period === p ? styles.toggleActive : {}) }}
              onClick={() => setPeriod(p)}
            >
              {p === 'fy' ? `FY${getFYYear()}` : `FY${getPrevFYYear()}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : reps.length === 0 ? (
        <div style={styles.empty}>No sellers added yet. Add sellers in the Admin panel. 🚀</div>
      ) : (
        <>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={{gridColumn: '1'}}>Rank</span>
              <span style={{gridColumn: '2'}}>Seller</span>
              <span style={{gridColumn: '3', textAlign: 'center'}}>Deals</span>
              <span style={{gridColumn: '4', textAlign: 'right'}}>Pipeline (S2+)</span>
              <span style={{gridColumn: '5', textAlign: 'right', opacity: isPrevFY ? 0.4 : 1}}>Points</span>
            </div>

            {displayedReps.map((rep, i) => {
              const rank = i + 1
              const isMe = currentUser?.id === rep.id
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
                        <span title={rep.segment} style={{ fontSize: '14px', lineHeight: 1, marginLeft: '4px' }}>
                          {SEGMENT_FLAG[rep.segment] || '🌐'}
                        </span>
                        <span style={styles.segmentLabel}>{SEGMENT_LABELS[rep.segment] || rep.segment}</span>
                        {rep.badges.length > 0 && (
                          <span style={styles.badgeIcons}>
                            {rep.badges.map((b, idx) => (
                              <span key={idx} style={styles.badgeIcon}>{b}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={styles.deals}>{rep.assessments}</div>

                  <div style={styles.pipeline}>
                    {formatPipeline(rep.pipeline)}
                  </div>

                  <div style={{ ...styles.pointsCell, opacity: isPrevFY ? 0.4 : 1 }}>
                    <div style={styles.pts}>{rep.points.toLocaleString()}</div>
                    {!isPrevFY && (
                      <div style={styles.barWrap}>
                        <div style={{ ...styles.bar, width: `${barWidth}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <button
              style={styles.seeMoreBtn}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show less ▲' : `See more (${reps.length - INITIAL_DISPLAY} more) ▼`}
            </button>
          )}
        </>
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
    gridTemplateColumns: '44px 1fr 70px 100px 110px',
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
    gridTemplateColumns: '44px 1fr 70px 100px 110px',
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
    gap: '4px',
    flexWrap: 'wrap',
  },
  youBadge: {
    fontSize: '10px',
    background: 'var(--red-light)',
    color: 'var(--red)',
    padding: '1px 6px',
    borderRadius: '99px',
    fontWeight: '500',
  },
  segmentLabel: {
    fontSize: '9px',
    background: 'var(--surface2)',
    color: 'var(--text3)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
    marginLeft: '2px',
  },
  badgeIcons: {
    display: 'inline-flex',
    gap: '2px',
    marginLeft: '4px',
  },
  badgeIcon: {
    fontSize: '12px',
  },
  deals: {
    fontSize: '14px',
    color: 'var(--text)',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  pipeline: {
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
  seeMoreBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '-1px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
    fontSize: '13px',
    color: 'var(--text2)',
    cursor: 'pointer',
    fontWeight: '500',
  },
}
