import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentPeriod, getCurrentMonth } from '../lib/fiscalYear'
import EditDealModal from './EditDealModal'

const SEGMENTS = [
  { value: 'UK Commercial',  label: '🇬🇧 UK Commercial' },
  { value: 'UK Government',  label: '🇬🇧 UK Government' },
  { value: 'France',         label: '🇫🇷 France' },
  { value: 'Germany',        label: '🇩🇪 Germany' },
  { value: 'LTS',            label: '🌐 LTS' },
]

const SEGMENT_FLAG = { 
  'UK Commercial': '🇬🇧', 
  'UK Government': '🇬🇧', 
  'France': '🇫🇷', 
  'Germany': '🇩🇪',
  'LTS': '🌐',
}

// Pipeline tier options
const PIPELINE_TIERS = [
  { value: 'none', label: 'No pipeline', points: 0 },
  { value: '50k-100k', label: '£50k – £100k', points: 25 },
  { value: '100k-250k', label: '£100k – £250k', points: 50 },
  { value: '250k+', label: '£250k+', points: 100 },
]

export default function AdminPanel({ currentUser }) {
  const [reps, setReps] = useState([])
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [segment, setSegment] = useState('UK Commercial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [editingRep, setEditingRep] = useState(null)
  const [editRepFields, setEditRepFields] = useState({})
  const [editRepError, setEditRepError] = useState(null)

  // Log Activity state
  const [selectedRep, setSelectedRep] = useState('')
  const [activityType, setActivityType] = useState('')
  const [isNetNew, setIsNetNew] = useState(false)
  const [pipelineTier, setPipelineTier] = useState('none')
  const [logLoading, setLogLoading] = useState(false)
  const [logSuccess, setLogSuccess] = useState(false)
  const [logError, setLogError] = useState(null)

  // Deals
  const [deals, setDeals] = useState([])
  const [editDeal, setEditDeal] = useState(null)
  const [deletingDeal, setDeletingDeal] = useState(null)

  // Packages (kept for backwards compatibility)
  const [packages, setPackages] = useState([])
  const [pkgUsage, setPkgUsage] = useState({})

  async function fetchReps() {
    const { data } = await supabase.from('sales_reps').select('*').order('name')
    if (data) setReps(data)
  }

  async function fetchDeals() {
    const { data } = await supabase
      .from('deals')
      .select('*, sales_reps(name)')
      .order('closed_at', { ascending: false })
      .limit(50)
    if (data) setDeals(data)
  }

  async function deleteDeal(id) {
    setDeletingDeal(id)
    await supabase.from('deals').delete().eq('id', id)
    await fetchDeals()
    fetchPackages()
    setDeletingDeal(null)
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
    fetchReps()
    fetchPackages()
    fetchDeals()
  }, [])

  async function addRep() {
    if (!name.trim()) { setError('Name is required.'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.from('sales_reps').insert({
      name: name.trim(),
      job_title: title.trim() || null,
      segment: segment || 'UK Commercial',
    })
    if (err) { setError(err.message) }
    else { setName(''); setTitle(''); setSegment('UK Commercial'); fetchReps() }
    setLoading(false)
  }

  async function deleteRep(id) {
    setDeleting(id)
    await supabase.from('sales_reps').delete().eq('id', id)
    fetchReps()
    setDeleting(null)
  }

  async function saveRep(rep) {
    if (!editRepFields.name?.trim()) { setEditRepError('Name is required.'); return }
    setEditRepError(null)
    const { error: err } = await supabase.from('sales_reps').update({
      name: editRepFields.name.trim(),
      job_title: editRepFields.job_title?.trim() || null,
      segment: editRepFields.segment || 'UK Commercial',
    }).eq('id', rep.id)
    if (err) { setEditRepError(err.message) }
    else { setEditingRep(null); fetchReps() }
  }

  // Log activity with structured inputs
  async function logActivity() {
    if (!selectedRep) { setLogError('Please select a seller.'); return }
    if (!activityType) { setLogError('Please select an activity type.'); return }
    
    setLogLoading(true)
    setLogError(null)

    const now = new Date()
    const period = getCurrentPeriod(now)
    const month = getCurrentMonth(now)

    // Calculate points based on activity type
    let points = 0
    let packageId = 'cloud-assessment'
    let packageName = 'Cloud Assessment'
    let value = 0

    if (activityType === 'assessment') {
      points = 100 // FY26 assessment base points
      if (isNetNew) points += 75 // Net new logo bonus
    }

    // Add pipeline points
    const tierInfo = PIPELINE_TIERS.find(t => t.value === pipelineTier)
    if (tierInfo) {
      points += tierInfo.points
      // Set approximate value based on tier
      if (pipelineTier === '50k-100k') value = 75000
      else if (pipelineTier === '100k-250k') value = 175000
      else if (pipelineTier === '250k+') value = 300000
    }

    const { error: err } = await supabase.from('deals').insert({
      rep_id: selectedRep,
      logged_by: currentUser?.id || null,
      package_id: packageId,
      package_name: packageName,
      client_name: null, // No client names for privacy
      value: value,
      points_earned: points,
      period,
      month,
      is_net_new: isNetNew,
      closed_at: now.toISOString(),
    })

    if (err) {
      setLogError(err.message)
    } else {
      setLogSuccess(true)
      setSelectedRep('')
      setActivityType('')
      setIsNetNew(false)
      setPipelineTier('none')
      fetchDeals()
      setTimeout(() => setLogSuccess(false), 2000)
    }
    setLogLoading(false)
  }

  return (
    <div>
      {/* Log Activity Section - Primary */}
      <h2 style={styles.sectionTitle}>Log Activity</h2>
      <p style={styles.sub}>Monthly logging of seller activities. Select a seller and use the checkboxes to record their achievements.</p>

      <div style={styles.logSection}>
        <div style={styles.logForm}>
          <div style={styles.formField}>
            <label style={styles.label}>Select Seller</label>
            <select
              style={styles.input}
              value={selectedRep}
              onChange={e => { setSelectedRep(e.target.value); setLogError(null) }}
            >
              <option value="">Choose a seller...</option>
              {reps.map(rep => (
                <option key={rep.id} value={rep.id}>
                  {SEGMENT_FLAG[rep.segment] || '🌐'} {rep.name} ({rep.segment || 'UK Commercial'})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.activitySection}>
            <label style={styles.label}>Activity Type</label>
            <div style={styles.checkboxGrid}>
              <label style={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="activity"
                  checked={activityType === 'assessment'}
                  onChange={() => { setActivityType('assessment'); setLogError(null) }}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>☁️ Cloud Assessment Closed</span>
                <span style={styles.checkboxPts}>+100 pts</span>
              </label>
            </div>
          </div>

          <div style={styles.activitySection}>
            <label style={styles.label}>Bonuses (Optional)</label>
            <div style={styles.checkboxGrid}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isNetNew}
                  onChange={e => setIsNetNew(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>🎯 Net New Logo</span>
                <span style={styles.checkboxPts}>+75 pts</span>
              </label>
            </div>
          </div>

          <div style={styles.activitySection}>
            <label style={styles.label}>Pipeline Tier (S2+)</label>
            <div style={styles.tierGrid}>
              {PIPELINE_TIERS.map(tier => (
                <label key={tier.value} style={styles.tierLabel}>
                  <input
                    type="radio"
                    name="pipeline"
                    checked={pipelineTier === tier.value}
                    onChange={() => setPipelineTier(tier.value)}
                    style={styles.checkbox}
                  />
                  <span style={styles.tierText}>{tier.label}</span>
                  {tier.points > 0 && <span style={styles.checkboxPts}>+{tier.points} pts</span>}
                </label>
              ))}
            </div>
          </div>

          {logError && <div style={styles.error}>{logError}</div>}
          {logSuccess && <div style={styles.success}>✓ Activity logged successfully!</div>}

          <button
            style={{ ...styles.logBtn, opacity: logLoading ? 0.7 : 1 }}
            onClick={logActivity}
            disabled={logLoading || !selectedRep || !activityType}
          >
            {logLoading ? 'Logging...' : 'Log Activity'}
          </button>
        </div>
      </div>

      {/* Manage sellers */}
      <h2 style={{ ...styles.sectionTitle, marginTop: '2.5rem' }}>Manage Sellers</h2>
      <p style={styles.sub}>Add and manage your team members. They'll appear in the activity logger and on the leaderboard.</p>

      <div style={styles.form}>
        <div style={{ ...styles.formRow, gridTemplateColumns: '1fr 1fr 180px auto' }}>
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
          <div style={styles.formField}>
            <label style={styles.label}>Segment</label>
            <select
              style={styles.input}
              value={segment}
              onChange={e => setSegment(e.target.value)}
            >
              {SEGMENTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div style={styles.formAction}>
            <label style={{ ...styles.label, visibility: 'hidden' }}>Add</label>
            <button
              style={{ ...styles.addBtn, opacity: loading ? 0.7 : 1 }}
              onClick={addRep}
              disabled={loading}
            >
              {loading ? 'Adding...' : '+ Add seller'}
            </button>
          </div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </div>

      <div style={styles.list}>
        {reps.length === 0 ? (
          <div style={styles.empty}>No sellers added yet. Add your first team member above.</div>
        ) : (
          reps.map((rep, i) => {
            const initials = rep.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const colors = [
              ['#E6F1FB', '#185FA5'], ['#E1F5EE', '#0F6E56'],
              ['#FAEEDA', '#854F0B'], ['#EEEDFE', '#534AB7'],
              ['#FBEAF0', '#993556'], ['#EAF3DE', '#3B6D11'],
            ]
            const [bg, fg] = colors[i % colors.length]
            const isEditing = editingRep === rep.id
            return (
              <div key={rep.id} style={styles.repRow}>
                {isEditing ? (
                  <>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="Full name"
                      value={editRepFields.name}
                      onChange={e => setEditRepFields(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="Job title (optional)"
                      value={editRepFields.job_title}
                      onChange={e => setEditRepFields(f => ({ ...f, job_title: e.target.value }))}
                    />
                    <select
                      style={{ ...styles.input, width: '160px', flexShrink: 0 }}
                      value={editRepFields.segment}
                      onChange={e => setEditRepFields(f => ({ ...f, segment: e.target.value }))}
                    >
                      {SEGMENTS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button style={styles.approveBtn} onClick={() => saveRep(rep)}>Save</button>
                    <button style={styles.rejectBtn} onClick={() => { setEditingRep(null); setEditRepError(null) }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div style={{ ...styles.avatar, background: bg, color: fg }}>{initials}</div>
                    <div style={styles.repInfo}>
                      <div style={styles.repName}>{rep.name}</div>
                      <div style={styles.repTitle}>
                        {[rep.job_title, rep.segment ? `${SEGMENT_FLAG[rep.segment] || ''} ${rep.segment}` : null]
                          .filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button
                      style={styles.rejectBtn}
                      onClick={() => {
                        setEditingRep(rep.id)
                        setEditRepFields({ name: rep.name, job_title: rep.job_title || '', segment: rep.segment || 'UK Commercial' })
                        setEditRepError(null)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      style={{ ...styles.deleteBtn, opacity: deleting === rep.id ? 0.5 : 1 }}
                      onClick={() => deleteRep(rep.id)}
                      disabled={deleting === rep.id}
                      title="Remove seller"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            )
          })
        )}
        {editRepError && <div style={styles.error}>{editRepError}</div>}
      </div>

      {/* Manage deals */}
      <h2 style={{ ...styles.sectionTitle, marginTop: '2.5rem' }}>Manage Logged Activities</h2>
      <p style={styles.sub}>View and edit the 50 most recent activities. Changes update the leaderboard immediately.</p>

      <div style={styles.list}>
        {deals.length === 0 ? (
          <div style={styles.empty}>No activities logged yet.</div>
        ) : (
          deals.map(deal => (
            <div key={deal.id} style={styles.dealRow}>
              <div style={styles.dealDate}>
                {new Date(deal.closed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
              </div>
              <div style={styles.repInfo}>
                <div style={styles.repName}>{deal.sales_reps?.name || '—'}</div>
                <div style={styles.repTitle}>
                  {deal.package_name}
                  {deal.is_net_new && ' · Net New'}
                  {deal.value > 0 && ` · £${deal.value >= 1000 ? Math.round(deal.value / 1000) + 'k' : deal.value}`}
                </div>
              </div>
              <div style={styles.dealPts}>+{deal.points_earned} pts</div>
              <button
                style={styles.rejectBtn}
                onClick={() => setEditDeal(deal)}
              >
                Edit
              </button>
              <button
                style={{ ...styles.deleteBtn, opacity: deletingDeal === deal.id ? 0.5 : 1 }}
                onClick={() => deleteDeal(deal.id)}
                disabled={deletingDeal === deal.id}
                title="Delete activity"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {editDeal && (
        <EditDealModal
          deal={editDeal}
          onClose={() => setEditDeal(null)}
          onSaved={() => { fetchDeals(); fetchPackages() }}
        />
      )}
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
  success: {
    marginTop: '10px',
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
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
  deleteBtn: {
    fontSize: '12px',
    color: 'var(--text3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  dealRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
  },
  dealDate: {
    fontSize: '12px',
    color: 'var(--text3)',
    whiteSpace: 'nowrap',
    width: '72px',
    flexShrink: 0,
  },
  dealPts: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--red)',
    whiteSpace: 'nowrap',
    minWidth: '60px',
    textAlign: 'right',
  },
  // Log Activity styles
  logSection: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    marginBottom: '1rem',
  },
  logForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  activitySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'var(--surface2)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: 'var(--red)',
  },
  checkboxText: {
    flex: 1,
    fontSize: '14px',
    color: 'var(--text)',
  },
  checkboxPts: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--red)',
  },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  tierLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: 'var(--surface2)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: '13px',
  },
  tierText: {
    flex: 1,
    color: 'var(--text)',
  },
  logBtn: {
    padding: '12px 24px',
    background: 'var(--red)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
}
