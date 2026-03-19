import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PACKAGES } from './LogDealModal'

const BADGES = [
  { name: 'Cloud Ace', desc: 'Close 5 Cloud Assessments', icon: '☁️', color: '#185FA5', bg: '#E6F1FB' },
  { name: 'Streak ×5', desc: '5 deals in a single week', icon: '🔥', color: '#c8961e', bg: '#FAEEDA' },
  { name: 'Rising Star', desc: 'Top mover vs last quarter', icon: '⭐', color: '#3B6D11', bg: '#EAF3DE' },
  { name: 'Enterprise Hunter', desc: 'Close a deal over £200k', icon: '🏢', color: '#534AB7', bg: '#EEEDFE' },
  { name: 'Portfolio Pro', desc: 'Close 3 different packages', icon: '🎯', color: '#993556', bg: '#FBEAF0' },
  { name: 'Quarter King/Queen', desc: '#1 on leaderboard at quarter close', icon: '👑', color: '#854F0B', bg: '#FAEEDA' },
]

export default function PackagesPage() {
  const [dealCounts, setDealCounts] = useState({})

  useEffect(() => {
    async function fetchCounts() {
      const { data } = await supabase
        .from('deals')
        .select('package_id')
      if (data) {
        const counts = {}
        data.forEach(d => {
          counts[d.package_id] = (counts[d.package_id] || 0) + 1
        })
        setDealCounts(counts)
      }
    }
    fetchCounts()
  }, [])

  const maxCount = Math.max(1, ...Object.values(dealCounts))

  return (
    <div>
      <h2 style={styles.sectionTitle}>Package point values</h2>
      <div style={styles.pkgGrid}>
        {PACKAGES.map(pkg => {
          const count = dealCounts[pkg.id] || 0
          const barW = Math.round((count / maxCount) * 100)
          return (
            <div key={pkg.id} style={styles.pkgCard}>
              <div style={{ ...styles.dot, background: pkg.color }} />
              <div style={styles.pkgInfo}>
                <div style={styles.pkgName}>{pkg.name}</div>
                <div style={styles.pkgPts}>{pkg.points} pts per close</div>
              </div>
              <div style={styles.pkgRight}>
                <div style={styles.pkgCount}>{count} closed</div>
                <div style={styles.barWrap}>
                  <div style={{ ...styles.bar, width: `${barW}%`, background: pkg.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <h2 style={{ ...styles.sectionTitle, marginTop: '2rem' }}>Achievement badges</h2>
      <div style={styles.badgeGrid}>
        {BADGES.map(b => (
          <div key={b.name} style={styles.badgeCard}>
            <div style={{ ...styles.badgeIcon, background: b.bg, color: b.color }}>{b.icon}</div>
            <div style={styles.badgeName}>{b.name}</div>
            <div style={styles.badgeDesc}>{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '1rem',
  },
  pkgGrid: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  pkgCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  pkgInfo: { flex: 1 },
  pkgName: { fontSize: '14px', fontWeight: '500', color: 'var(--text)' },
  pkgPts: { fontSize: '12px', color: 'var(--text3)', marginTop: '1px' },
  pkgRight: { minWidth: '120px', textAlign: 'right' },
  pkgCount: { fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' },
  barWrap: {
    height: '4px',
    background: 'var(--border)',
    borderRadius: '2px',
  },
  bar: {
    height: '4px',
    borderRadius: '2px',
    opacity: 0.7,
    transition: 'width 0.5s ease',
  },
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  },
  badgeCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  badgeIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    marginBottom: '4px',
  },
  badgeName: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' },
  badgeDesc: { fontSize: '12px', color: 'var(--text3)', lineHeight: '1.5' },
}
