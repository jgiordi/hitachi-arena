import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AppAdminPanel({ currentUser }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [activeUsers, setActiveUsers] = useState([])
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [togglingSuper, setTogglingSuper] = useState(null)
  const [revokingUser, setRevokingUser] = useState(null)

  async function fetchPendingUsers() {
    const { data } = await supabase
      .from('reps')
      .select('*')
      .eq('approved', false)
      .order('created_at')
    if (data) setPendingUsers(data)
  }

  async function fetchActiveUsers() {
    const { data } = await supabase
      .from('reps')
      .select('*')
      .eq('approved', true)
      .order('created_at')
    if (data) setActiveUsers(data)
  }

  useEffect(() => {
    fetchPendingUsers()
    fetchActiveUsers()
  }, [])

  async function approveUser(user) {
    setApproving(user.id)
    await supabase.from('reps').update({ approved: true }).eq('id', user.id)
    fetchPendingUsers()
    fetchActiveUsers()
    setApproving(null)
  }

  async function rejectUser(user) {
    setRejecting(user.id)
    await supabase.from('reps').delete().eq('id', user.id)
    fetchPendingUsers()
    setRejecting(null)
  }

  async function toggleSuperuser(user) {
    setTogglingSuper(user.id)
    await supabase.from('reps').update({ is_superuser: !user.is_superuser }).eq('id', user.id)
    fetchActiveUsers()
    setTogglingSuper(null)
  }

  async function revokeAccess(user) {
    setRevokingUser(user.id)
    await supabase.from('reps').update({ approved: false, is_superuser: false }).eq('id', user.id)
    fetchActiveUsers()
    fetchPendingUsers()
    setRevokingUser(null)
  }

  const avatarColors = [
    ['#E6F1FB', '#185FA5'], ['#E1F5EE', '#0F6E56'],
    ['#FAEEDA', '#854F0B'], ['#EEEDFE', '#534AB7'],
    ['#FBEAF0', '#993556'], ['#EAF3DE', '#3B6D11'],
  ]

  return (
    <div>
      {/* Pending approvals */}
      <h2 style={styles.sectionTitle}>Pending approvals</h2>
      <p style={styles.sub}>Users who have signed up and are waiting for access.</p>

      <div style={{ ...styles.list, marginBottom: '2rem' }}>
        {pendingUsers.length === 0 ? (
          <div style={styles.empty}>No pending requests. 🎉</div>
        ) : (
          pendingUsers.map((user, i) => {
            const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const [bg, fg] = avatarColors[i % avatarColors.length]
            return (
              <div key={user.id} style={styles.row}>
                <div style={{ ...styles.avatar, background: bg, color: fg }}>{initials}</div>
                <div style={styles.info}>
                  <div style={styles.name}>{user.name}</div>
                  <div style={styles.sub2}>{user.email}</div>
                </div>
                <div style={styles.meta}>
                  Requested {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...styles.approveBtn, opacity: approving === user.id ? 0.6 : 1 }}
                    onClick={() => approveUser(user)}
                    disabled={approving === user.id || rejecting === user.id}
                  >
                    {approving === user.id ? '...' : 'Approve'}
                  </button>
                  <button
                    style={{ ...styles.outlineBtn, opacity: rejecting === user.id ? 0.6 : 1 }}
                    onClick={() => rejectUser(user)}
                    disabled={approving === user.id || rejecting === user.id}
                  >
                    {rejecting === user.id ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Active users */}
      <h2 style={styles.sectionTitle}>Active users</h2>
      <p style={styles.sub}>All users with access. Toggle admin rights or revoke access.</p>

      <div style={styles.list}>
        {activeUsers.length === 0 ? (
          <div style={styles.empty}>No active users yet.</div>
        ) : (
          activeUsers.map((user, i) => {
            const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const [bg, fg] = avatarColors[i % avatarColors.length]
            const isMe = user.id === currentUser?.id
            return (
              <div key={user.id} style={styles.row}>
                <div style={{ ...styles.avatar, background: bg, color: fg }}>{initials}</div>
                <div style={styles.info}>
                  <div style={{ ...styles.name, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {user.name}
                    {isMe && <span style={styles.youTag}>you</span>}
                    {user.is_superuser && <span style={styles.adminTag}>app admin</span>}
                  </div>
                  <div style={styles.sub2}>{user.email}</div>
                </div>
                <div style={styles.meta}>
                  Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </div>
                {!isMe && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{ ...styles.outlineBtn, opacity: togglingSuper === user.id ? 0.6 : 1 }}
                      onClick={() => toggleSuperuser(user)}
                      disabled={togglingSuper === user.id || revokingUser === user.id}
                    >
                      {togglingSuper === user.id ? '...' : user.is_superuser ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button
                      style={{ ...styles.revokeBtn, opacity: revokingUser === user.id ? 0.6 : 1 }}
                      onClick={() => revokeAccess(user)}
                      disabled={togglingSuper === user.id || revokingUser === user.id}
                    >
                      {revokingUser === user.id ? '...' : 'Revoke'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const styles = {
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: '1.6' },
  list: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  empty: { padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: { fontSize: '14px', fontWeight: '500', color: 'var(--text)' },
  sub2: { fontSize: '12px', color: 'var(--text3)', marginTop: '1px' },
  meta: { fontSize: '12px', color: 'var(--text3)', marginRight: '8px', whiteSpace: 'nowrap' },
  approveBtn: {
    padding: '6px 14px',
    background: '#166534',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  outlineBtn: {
    padding: '6px 14px',
    background: 'none',
    color: 'var(--text3)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  revokeBtn: {
    padding: '6px 14px',
    background: 'none',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  youTag: {
    fontSize: '10px',
    background: 'var(--red-light)',
    color: 'var(--red)',
    padding: '1px 6px',
    borderRadius: '99px',
    fontWeight: '500',
  },
  adminTag: {
    fontSize: '10px',
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '1px 6px',
    borderRadius: '99px',
    fontWeight: '500',
  },
}
