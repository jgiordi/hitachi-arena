import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentFYPrefix } from '../lib/fiscalYear'

// Cloud Cup Badge Definitions
const BADGES = [
  { 
    id: 'quarter-star',
    name: 'Quarter Star', 
    icon: '⭐', 
    desc: 'Most Cloud Assessments sold in a quarter',
    color: '#c8961e', 
    bg: '#fefce8',
    criteria: 'Awarded to the top seller by assessment count each quarter'
  },
  { 
    id: 'cloud-ace',
    name: 'Cloud Ace', 
    icon: '☁️', 
    desc: 'Most pipeline generated (post-assessment)',
    color: '#185FA5', 
    bg: '#E6F1FB',
    criteria: 'Highest total pipeline value from closed assessments'
  },
  { 
    id: 'hunter',
    name: 'Hunter', 
    icon: '🎯', 
    desc: 'Net new logo wins',
    color: '#0F6E56', 
    bg: '#E1F5EE',
    criteria: 'Closed a Cloud Assessment with a brand new customer'
  },
  { 
    id: 'portfolio-pro',
    name: 'Portfolio Pro', 
    icon: '📊', 
    desc: 'Multiple assessments within same account',
    color: '#534AB7', 
    bg: '#EEEDFE',
    criteria: 'Closed 2+ Cloud Assessments with the same customer'
  },
  { 
    id: 'fire-streak',
    name: 'Fire Streak', 
    icon: '🔥', 
    desc: 'Two deals closed within a single quarter',
    color: '#993556', 
    bg: '#FBEAF0',
    criteria: 'Closed 2 or more assessments in one quarter'
  },
]

function BadgeCard({ badge, holders }) {
  return (
    <div style={styles.badgeCard}>
      <div style={{ ...styles.badgeIcon, background: badge.bg, color: badge.color }}>
        {badge.icon}
      </div>
      <div style={styles.badgeInfo}>
        <div style={styles.badgeName}>{badge.name}</div>
        <div style={styles.badgeDesc}>{badge.desc}</div>
        <div style={styles.badgeCriteria}>{badge.criteria}</div>
      </div>
      {holders.length > 0 && (
        <div style={styles.holdersSection}>
          <div style={styles.holdersLabel}>Earned by:</div>
          <div style={styles.holdersList}>
            {holders.map((holder, i) => (
              <span key={i} style={styles.holderBadge}>
                {holder.name} {holder.emoji || ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BadgesPage() {
  const [badgeHolders, setBadgeHolders] = useState({})
  const [loading, setLoading] = useState(true)
  const [scoringRules, setScoringRules] = useState([])

  useEffect(() => {
    fetchBadgeData()
  }, [])

  async function fetchBadgeData() {
    setLoading(true)
    const fyPrefix = getCurrentFYPrefix()

    // Fetch all sales reps
    const { data: salesReps } = await supabase
      .from('sales_reps')
      .select('*')

    // Fetch deals for current FY
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .like('period', fyPrefix + '%')

    if (!salesReps || !deals) {
      setLoading(false)
      return
    }

    const holders = {}

    // Calculate Quarter Star (most assessments in quarter)
    const quarterCounts = {}
    deals.filter(d => d.package_id === 'cloud-assessment').forEach(d => {
      const key = `${d.rep_id}-${d.period}`
      if (!quarterCounts[d.rep_id]) quarterCounts[d.rep_id] = 0
      quarterCounts[d.rep_id]++
    })
    const topByAssessments = Object.entries(quarterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([repId, count]) => {
        const rep = salesReps.find(r => r.id === repId)
        return { name: rep?.name || 'Unknown', count }
      })
      .filter(h => h.count > 0)
    holders['quarter-star'] = topByAssessments

    // Calculate Cloud Ace (most pipeline)
    const pipelineByRep = {}
    deals.forEach(d => {
      if (!pipelineByRep[d.rep_id]) pipelineByRep[d.rep_id] = 0
      pipelineByRep[d.rep_id] += d.value || 0
    })
    const topByPipeline = Object.entries(pipelineByRep)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([repId, pipeline]) => {
        const rep = salesReps.find(r => r.id === repId)
        return { name: rep?.name || 'Unknown', pipeline }
      })
      .filter(h => h.pipeline > 0)
    holders['cloud-ace'] = topByPipeline

    // Calculate Hunter (net new logos)
    const netNewByRep = {}
    deals.filter(d => d.is_net_new).forEach(d => {
      if (!netNewByRep[d.rep_id]) netNewByRep[d.rep_id] = 0
      netNewByRep[d.rep_id]++
    })
    const hunters = Object.entries(netNewByRep)
      .filter(([, count]) => count > 0)
      .map(([repId, count]) => {
        const rep = salesReps.find(r => r.id === repId)
        return { name: rep?.name || 'Unknown', emoji: '🎯' }
      })
    holders['hunter'] = hunters

    // Calculate Portfolio Pro (multiple assessments same account)
    const accountsByRep = {}
    deals.filter(d => d.package_id === 'cloud-assessment').forEach(d => {
      if (!accountsByRep[d.rep_id]) accountsByRep[d.rep_id] = {}
      const account = d.account_id || d.client_name || 'unknown'
      accountsByRep[d.rep_id][account] = (accountsByRep[d.rep_id][account] || 0) + 1
    })
    const portfolioPros = Object.entries(accountsByRep)
      .filter(([repId, accounts]) => Object.values(accounts).some(c => c >= 2))
      .map(([repId]) => {
        const rep = salesReps.find(r => r.id === repId)
        return { name: rep?.name || 'Unknown', emoji: '📊' }
      })
    holders['portfolio-pro'] = portfolioPros

    // Calculate Fire Streak (2+ deals in same quarter)
    const quarterByRep = {}
    deals.filter(d => d.package_id === 'cloud-assessment').forEach(d => {
      if (!quarterByRep[d.rep_id]) quarterByRep[d.rep_id] = {}
      const quarter = d.period
      quarterByRep[d.rep_id][quarter] = (quarterByRep[d.rep_id][quarter] || 0) + 1
    })
    const fireStreaks = Object.entries(quarterByRep)
      .filter(([repId, quarters]) => Object.values(quarters).some(c => c >= 2))
      .map(([repId]) => {
        const rep = salesReps.find(r => r.id === repId)
        return { name: rep?.name || 'Unknown', emoji: '🔥' }
      })
    holders['fire-streak'] = fireStreaks

    setBadgeHolders(holders)
    setLoading(false)
  }

  if (loading) {
    return <div style={styles.loading}>Loading badges...</div>
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Cloud Cup Badges</h2>
      <p style={styles.sub}>
        Earn badges through outstanding performance. Badges are displayed on the leaderboard next to your name.
      </p>

      <div style={styles.badgeGrid}>
        {BADGES.map(badge => (
          <BadgeCard 
            key={badge.id} 
            badge={badge} 
            holders={badgeHolders[badge.id] || []} 
          />
        ))}
      </div>

      {/* Scoring Rules Section */}
      <div style={styles.scoringSection}>
        <h3 style={styles.scoringTitle}>📋 Scoring Rules & Prize Structure</h3>
        
        <div style={styles.rulesGrid}>
          <div style={styles.ruleCard}>
            <div style={styles.ruleHeader}>Points Scoring</div>
            <ul style={styles.ruleList}>
              <li>FY25 Assessment: +50 pts</li>
              <li>FY26 Assessment: +100 pts</li>
              <li>2nd Deal Bonus: +25 pts</li>
              <li>3rd+ Deal (each): +50 pts</li>
              <li>Same Account Bonus: +50 pts</li>
              <li>Net New Logo: +75 pts</li>
              <li>2 Deals in Quarter: +100 pts</li>
            </ul>
          </div>

          <div style={styles.ruleCard}>
            <div style={styles.ruleHeader}>Pipeline Thresholds</div>
            <ul style={styles.ruleList}>
              <li>£50k – £100k: +25 pts</li>
              <li>£100k – £250k: +50 pts</li>
              <li>£250k+: +100 pts</li>
            </ul>
          </div>

          <div style={styles.ruleCard}>
            <div style={styles.ruleHeader}>Prize Structure</div>
            <ul style={styles.ruleList}>
              <li>🥇 1st Place: TBD</li>
              <li>🥈 2nd Place: TBD</li>
              <li>🥉 3rd Place: TBD</li>
              <li>📈 Top Regional Team: TBD</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  loading: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text3)',
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '6px',
  },
  sub: {
    fontSize: '13px',
    color: 'var(--text2)',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  badgeCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  badgeIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '4px',
  },
  badgeDesc: {
    fontSize: '13px',
    color: 'var(--text2)',
    marginBottom: '6px',
  },
  badgeCriteria: {
    fontSize: '11px',
    color: 'var(--text3)',
    fontStyle: 'italic',
  },
  holdersSection: {
    borderTop: '1px solid var(--border)',
    paddingTop: '10px',
    marginTop: '4px',
  },
  holdersLabel: {
    fontSize: '10px',
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  holdersList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  holderBadge: {
    fontSize: '11px',
    background: 'var(--surface2)',
    color: 'var(--text)',
    padding: '3px 8px',
    borderRadius: '6px',
    fontWeight: '500',
  },
  scoringSection: {
    marginTop: '2.5rem',
  },
  scoringTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '1rem',
  },
  rulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  ruleCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
  },
  ruleHeader: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)',
  },
  ruleList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '12px',
    color: 'var(--text2)',
    lineHeight: '1.8',
  },
}
