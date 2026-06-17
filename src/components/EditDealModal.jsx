import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentPeriod, getCurrentMonth } from '../lib/fiscalYear'

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

// Derive pipeline tier from value
function getPipelineTierFromValue(val) {
  if (!val || val < 50000) return 'none'
  if (val < 100000) return '50k-100k'
  if (val < 250000) return '100k-250k'
  return '250k+'
}

export default function EditDealModal({ deal, onClose, onSaved }) {
  const [repId, setRepId] = useState(deal.rep_id)
  const [dealType, setDealType] = useState(deal.package_id === 'cloud-assessment' ? 'assessment' : '')
  const [isNetNew, setIsNetNew] = useState(deal.is_net_new || false)
  const [pipelineTier, setPipelineTier] = useState(getPipelineTierFromValue(deal.value))
  const [closedAt, setClosedAt] = useState(deal.closed_at ? deal.closed_at.slice(0, 10) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reps, setReps] = useState([])

  useEffect(() => {
    supabase.from('sales_reps').select('*').order('name').then(({ data }) => {
      if (data) setReps(data)
    })
  }, [])

  // Calculate total points
  function calculatePoints() {
    let points = 0
    if (dealType === 'assessment') {
      points = 100 // FY26 assessment base points
      if (isNetNew) points += 75 // Net new logo bonus
    }
    const tierInfo = PIPELINE_TIERS.find(t => t.value === pipelineTier)
    if (tierInfo) points += tierInfo.points
    return points
  }

  async function handleSave() {
    if (!repId) { setError('Please select a seller.'); return }
    if (!dealType) { setError('Please select a deal type.'); return }

    setLoading(true)
    setError(null)

    const date = closedAt ? new Date(closedAt + 'T12:00:00') : new Date(deal.closed_at)
    const period = getCurrentPeriod(date)
    const month = getCurrentMonth(date)

    // Calculate value from pipeline tier
    let value = 0
    if (pipelineTier === '50k-100k') value = 75000
    else if (pipelineTier === '100k-250k') value = 175000
    else if (pipelineTier === '250k+') value = 300000

    const { error: err } = await supabase.from('deals').update({
      rep_id: repId,
      package_id: 'cloud-assessment',
      package_name: 'Cloud Assessment',
      client_name: null,
      value: value,
      points_earned: calculatePoints(),
      period,
      month,
      is_net_new: isNetNew,
      closed_at: date.toISOString(),
    }).eq('id', deal.id)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onSaved()
      onClose()
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Deal</h2>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Select Seller</label>
          <select style={styles.input} value={repId} onChange={e => { setRepId(e.target.value); setError(null) }}>
            <option value="">Choose a seller...</option>
            {reps.map(rep => (
              <option key={rep.id} value={rep.id}>
                {SEGMENT_FLAG[rep.segment] || '🌐'} {rep.name} ({rep.segment || 'UK Commercial'})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Deal Type</label>
          <div style={styles.checkboxGrid}>
            <label style={styles.checkboxLabel}>
              <input
                type="radio"
                name="deal"
                checked={dealType === 'assessment'}
                onChange={() => { setDealType('assessment'); setError(null) }}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>☁️ Cloud Assessment Closed</span>
              <span style={styles.checkboxPts}>+100 pts</span>
            </label>
          </div>
        </div>

        <div style={styles.field}>
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

        <div style={styles.field}>
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

        <div style={styles.field}>
          <label style={styles.label}>Date Closed</label>
          <input
            style={styles.input}
            type="date"
            value={closedAt}
            onChange={e => { setClosedAt(e.target.value); setError(null) }}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={loading || !repId || !dealType}
          >
            {loading ? 'Saving...' : `Save Changes · ${calculatePoints()} pts`}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--surface)',
    zIndex: 1,
  },
  title: { fontSize: '16px', fontWeight: '600', color: 'var(--text)' },
  close: {
    fontSize: '16px',
    color: 'var(--text3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  field: { padding: '1rem 1.5rem 0' },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0 1rem',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  packageGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  pkgOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '10px 12px',
    background: 'var(--surface2)',
    border: '1.5px solid transparent',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'all 0.1s',
    textAlign: 'left',
  },
  pkgSelected: {
    background: 'var(--surface)',
    boxShadow: 'var(--shadow)',
  },
  pkgName: { fontSize: '13px', fontWeight: '500', color: 'var(--text)' },
  pkgPts: { fontSize: '11px', fontWeight: '500' },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    color: 'var(--text)',
    background: 'var(--surface)',
    outline: 'none',
  },
  error: {
    margin: '1rem 1.5rem 0',
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    fontSize: '13px',
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '1.25rem 1.5rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelBtn: {
    padding: '9px 18px',
    background: 'none',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    color: 'var(--text2)',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 18px',
    background: 'var(--red)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
  },
}
