import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPanel({ currentUser }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [reps, setReps] = useState([])
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)

  async function fetchPendingUsers() {
    const { data } = await supabase
      .from('reps')
      .select('*')
      .eq('approved', false)
      .order('created_at')
    if (data) setPendingUsers(data)
  }

  async function fetchReps() {
    const { data } = await supabase.from('sales_reps').select('*').order('name')
    if (data) setReps(data)
  }

  useEffect(() => {
    fetchPendingUsers()
    fetchReps()
  }, [])

  async function approveUser(user) {
    setApproving(user.id)
    await supabase.from('reps').update({ approved: true }).eq('id', user.id)
    fetchPendingUsers()
    setApproving(null)
  }

  async function rejectUser(user) {
    setRejecting(user.id)
    await supabase.from('reps').delete().eq('id', user.id)
    fetchPendingUsers()
    setRejecting(null)
  }

  async function addRep() {
    if (!name.trim()) { setError('Name is required.'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.from('sales_reps').insert({
      name: name.trim(),
      job_title: title.trim() || null,
    })
    if (err) { setError(err.message) }
    else { setName(''); setTitle(''); fetchReps() }
    setLoading(false)
  }

  async function deleteRep(id) {
    setDeleting(id)
    await supabase.from('sales_reps').delete().eq('id', id)
    fetchReps()
    setDeleting(null)
  }

  return (
    <div>
      {/* Pending approvals */}
      <h2 style={styles.sectionTitle}>Pending approvals</h2>
      <p style={styles.sub}>Users who have requested access and are waiting for approval.</p>

      <div style={{ ...styles.list, marginBottom: '2rem' }}>
        {pendingUsers.length === 0 ? (
          <div style={styles.empty}>No pending requests.</div>
        ) : (
          pendingUsers.map((user, i) => {
            const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const colors = [
              ['#E6F1FB', '#185FA5'], ['#E1F5EE', '#0F6E56'],
              ['#FAEEDA', '#854F0B'], ['#EEEDFE', '#534AB7'],
              ['#FBEAF0', '#993556'], ['#EAF3DE', '#3B6D11'],
            ]
            const [bg, fg] = colors[i % colors.length]
            return (
              <div key={user.id} style={styles.repRow}>
                <div style={{ ...styles.avatar, background: bg, color: fg }}>{initials}</div>
                <div style={styles.repInfo}>
                  <div style={styles.repName}>{user.name}</div>
                  <div style={styles.repTitle}>{user.email}</div>
                </div>
                <div style={styles.repMeta}>
                  <span style={styles.addedDate}>
                    Requested {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
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
                    style={{ ...styles.rejectBtn, opacity: rejecting === user.id ? 0.6 : 1 }}
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

      {/* Manage sales reps */}
      <h2 style={styles.sectionTitle}>Manage sales reps</h2>
      <p style={styles.sub}>Add your team members here. They'll appear in the "Log deal" rep selector and on the leaderboard.</p>

      <div style={styles.form}>
        <div style={styles.formRow}>
          <div style={styles.formField}>
            <label style={styles.label}>Full name</label>
            <input
              style={styles.input}
              placeholder="e.g. Sarah Khan"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRep()}
            />
          </div>
          <div style={styles.formField}>
            <label style={styles.label}>Job title (optional)</label>
            <input
              style={styles.input}
              placeholder="e.g. Senior Account Executive"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRep()}
            />
          </div>
          <div style={styles.formAction}>
            <label style={{ ...styles.label, visibility: 'hidden' }}>Add</label>
            <button
              style={{ ...styles.addBtn, opacity: loading ? 0.7 : 1 }}
              onClick={addRep}
              disabled={loading}
            >
              {loading ? 'Adding...' : '+ Add rep'}
            </button>
          </div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </div>

      <div style={styles.list}>
        {reps.length === 0 ? (
          <div style={styles.empty}>No reps added yet. Add your first team member above.</div>
        ) : (
          reps.map((rep, i) => {
            const initials = rep.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const colors = [
              ['#E6F1FB', '#185FA5'], ['#E1F5EE', '#0F6E56'],
              ['#FAEEDA', '#854F0B'], ['#EEEDFE', '#534AB7'],
              ['#FBEAF0', '#993556'], ['#EAF3DE', '#3B6D11'],
            ]
            const [bg, fg] = colors[i % colors.length]
            return (
              <div key={rep.id} style={styles.repRow}>
                <div style={{ ...styles.avatar, background: bg, color: fg }}>{initials}</div>
                <div style={styles.repInfo}>
                  <div style={styles.repName}>{rep.name}</div>
                  {rep.job_title && <div style={styles.repTitle}>{rep.job_title}</div>}
                </div>
                <div style={styles.repMeta}>
                  <span style={styles.addedDate}>Added {new Date(rep.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
                <button
                  style={{ ...styles.deleteBtn, opacity: deleting === rep.id ? 0.5 : 1 }}
                  onClick={() => deleteRep(rep.id)}
                  disabled={deleting === rep.id}
                  title="Remove rep"
                >
                  ✕
                </button>
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
  form: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: '12px',
    alignItems: 'end',
  },
  formField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  formAction: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: '9px 12px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
    width: '100%',
  },
  addBtn: {
    padding: '9px 18px',
    background: 'var(--red)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
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
  rejectBtn: {
    padding: '6px 14px',
    background: 'none',
    color: 'var(--text3)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  error: {
    marginTop: '10px',
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    fontSize: '13px',
  },
  list: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  empty: { padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' },
  repRow: {
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
  repInfo: { flex: 1 },
  repName: { fontSize: '14px', fontWeight: '500', color: 'var(--text)' },
  repTitle: { fontSize: '12px', color: 'var(--text3)', marginTop: '1px' },
  repMeta: { marginRight: '8px' },
  addedDate: { fontSize: '12px', color: 'var(--text3)' },
  deleteBtn: {
    fontSize: '12px',
    color: 'var(--text3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
}
