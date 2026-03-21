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

  // Packages
  const [packages, setPackages] = useState([])
  const [pkgUsage, setPkgUsage] = useState({})
  const [pkgName, setPkgName] = useState('')
  const [pkgPoints, setPkgPoints] = useState('')
  const [pkgColor, setPkgColor] = useState('#185FA5')
  const [pkgLoading, setPkgLoading] = useState(false)
  const [pkgError, setPkgError] = useState(null)
  const [editingPkg, setEditingPkg] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [deletingPkg, setDeletingPkg] = useState(null)

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

  async function fetchPackages() {
    const [{ data: pkgs }, { data: deals }] = await Promise.all([
      supabase.from('packages').select('*').order('created_at'),
      supabase.from('deals').select('package_id'),
    ])
    if (pkgs) setPackages(pkgs)
    if (deals) {
      const usage = {}
      deals.forEach(d => { usage[d.package_id] = (usage[d.package_id] || 0) + 1 })
      setPkgUsage(usage)
    }
  }

  useEffect(() => {
    fetchPendingUsers()
    fetchReps()
    fetchPackages()
  }, [])

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function addPackage() {
    if (!pkgName.trim()) { setPkgError('Name is required.'); return }
    const pts = parseInt(pkgPoints)
    if (!pkgPoints || isNaN(pts) || pts <= 0) { setPkgError('Points must be a positive number.'); return }
    setPkgLoading(true)
    setPkgError(null)
    const { error: err } = await supabase.from('packages').insert({
      id: slugify(pkgName.trim()),
      name: pkgName.trim(),
      points: pts,
      color: pkgColor,
    })
    if (err) { setPkgError(err.message) }
    else { setPkgName(''); setPkgPoints(''); setPkgColor('#185FA5'); fetchPackages() }
    setPkgLoading(false)
  }

  async function savePackage(pkg) {
    const pts = parseInt(editFields.points)
    if (!editFields.name?.trim()) { setPkgError('Name is required.'); return }
    if (!editFields.points || isNaN(pts) || pts <= 0) { setPkgError('Points must be a positive number.'); return }
    setPkgError(null)
    const { error: err } = await supabase.from('packages').update({
      name: editFields.name.trim(),
      points: pts,
      color: editFields.color,
    }).eq('id', pkg.id)
    if (err) { setPkgError(err.message) }
    else { setEditingPkg(null); fetchPackages() }
  }

  async function deletePackage(pkg) {
    setDeletingPkg(pkg.id)
    await supabase.from('packages').delete().eq('id', pkg.id)
    fetchPackages()
    setDeletingPkg(null)
  }

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

      {/* Manage packages */}
      <h2 style={{ ...styles.sectionTitle, marginTop: '2.5rem' }}>Manage packages</h2>
      <p style={styles.sub}>Create or update packages that appear in the deal logger. Packages used in deals cannot be deleted.</p>

      <div style={styles.form}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 44px auto', gap: '12px', alignItems: 'end' }}>
          <div style={styles.formField}>
            <label style={styles.label}>Package name</label>
            <input
              style={styles.input}
              placeholder="e.g. Azure Migration"
              value={pkgName}
              onChange={e => setPkgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPackage()}
            />
          </div>
          <div style={styles.formField}>
            <label style={styles.label}>Points</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              placeholder="e.g. 300"
              value={pkgPoints}
              onChange={e => setPkgPoints(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPackage()}
            />
          </div>
          <div style={styles.formField}>
            <label style={styles.label}>Colour</label>
            <input
              type="color"
              style={{ ...styles.input, padding: '3px 4px', height: '38px', cursor: 'pointer' }}
              value={pkgColor}
              onChange={e => setPkgColor(e.target.value)}
            />
          </div>
          <div style={styles.formAction}>
            <label style={{ ...styles.label, visibility: 'hidden' }}>Add</label>
            <button
              style={{ ...styles.addBtn, opacity: pkgLoading ? 0.7 : 1 }}
              onClick={addPackage}
              disabled={pkgLoading}
            >
              {pkgLoading ? 'Adding...' : '+ Add package'}
            </button>
          </div>
        </div>
        {pkgError && <div style={styles.error}>{pkgError}</div>}
      </div>

      <div style={styles.list}>
        {packages.length === 0 ? (
          <div style={styles.empty}>No packages yet.</div>
        ) : (
          packages.map(pkg => {
            const inUse = (pkgUsage[pkg.id] || 0) > 0
            const isEditing = editingPkg === pkg.id
            return (
              <div key={pkg.id} style={styles.repRow}>
                {isEditing ? (
                  <>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      value={editFields.name}
                      onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      style={{ ...styles.input, width: '90px' }}
                      type="number"
                      min="1"
                      value={editFields.points}
                      onChange={e => setEditFields(f => ({ ...f, points: e.target.value }))}
                    />
                    <input
                      type="color"
                      style={{ ...styles.input, padding: '3px 4px', width: '48px', height: '36px', cursor: 'pointer', flexShrink: 0 }}
                      value={editFields.color}
                      onChange={e => setEditFields(f => ({ ...f, color: e.target.value }))}
                    />
                    <button style={styles.approveBtn} onClick={() => savePackage(pkg)}>Save</button>
                    <button style={styles.rejectBtn} onClick={() => { setEditingPkg(null); setPkgError(null) }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div style={{ ...styles.dot, background: pkg.color }} />
                    <div style={styles.repInfo}>
                      <div style={styles.repName}>{pkg.name}</div>
                      <div style={styles.repTitle}>
                        {pkg.points} pts per close
                        {inUse ? ` · ${pkgUsage[pkg.id]} deal${pkgUsage[pkg.id] !== 1 ? 's' : ''}` : ''}
                      </div>
                    </div>
                    <button
                      style={{ ...styles.rejectBtn, marginRight: '4px' }}
                      onClick={() => { setEditingPkg(pkg.id); setEditFields({ name: pkg.name, points: pkg.points, color: pkg.color }); setPkgError(null) }}
                    >
                      Edit
                    </button>
                    <button
                      style={{ ...styles.deleteBtn, opacity: (inUse || deletingPkg === pkg.id) ? 0.35 : 1, cursor: inUse ? 'not-allowed' : 'pointer' }}
                      onClick={() => !inUse && deletePackage(pkg)}
                      disabled={inUse || deletingPkg === pkg.id}
                      title={inUse ? 'Cannot delete — package is used in existing deals' : 'Delete package'}
                    >
                      ✕
                    </button>
                  </>
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
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
}
