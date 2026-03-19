import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const PKG_COLORS = {
  'cloud-assessment': '#185FA5',
  'modern-workplace': '#0F6E56',
  'security-assessment': '#993556',
  'data-ai-accelerator': '#854F0B',
  'sap-migration': '#534AB7',
  'support-managed': '#3B6D11',
}

export default function ActivityFeed() {
  const [deals, setDeals] = useState([])

  async function fetchFeed() {
    const { data } = await supabase
      .from('deals')
      .select('*, reps(name, avatar_url)')
      .order('closed_at', { ascending: false })
      .limit(20)
    if (data) setDeals(data)
  }

  useEffect(() => {
    fetchFeed()
    const channel = supabase
      .channel('feed-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deals' }, () => {
        fetchFeed()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  if (deals.length === 0) return null

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Recent activity</h2>
      <div style={styles.feed}>
        {deals.map(d => (
          <div key={d.id} style={styles.item}>
            <div style={{ ...styles.dot, background: PKG_COLORS[d.package_id] || '#888' }} />
            <div style={styles.text}>
              <strong style={styles.strong}>{d.reps?.name || 'Someone'}</strong>
              {' '}closed a{' '}
              <strong style={styles.strong}>{d.package_name}</strong>
              {d.client_name ? ` with ${d.client_name}` : ''}
              {' '}— <span style={styles.pts}>+{d.points_earned} pts</span>
            </div>
            <div style={styles.time}>{timeAgo(d.closed_at)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrap: { marginTop: '1.5rem' },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '1rem',
  },
  feed: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  item: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--text2)',
    lineHeight: '1.5',
  },
  strong: { color: 'var(--text)', fontWeight: '500' },
  pts: { color: 'var(--red)', fontWeight: '500' },
  time: {
    fontSize: '11px',
    color: 'var(--text3)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
}
