import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentPeriod } from '../lib/fiscalYear'

const COUNTRY_FLAG = { UK: '🇬🇧', France: '🇫🇷', Germany: '🇩🇪' }

export default function EditDealModal({ deal, onClose, onSaved }) {
  const [repId, setRepId] = useState(deal.rep_id)
  const [packageId, setPackageId] = useState(deal.package_id)
  const [client, setClient] = useState(deal.client_name || '')
  const [value, setValue] = useState(deal.value?.toString() || '')
  const [closedAt, setClosedAt] = useState(deal.closed_at ? deal.closed_at.slice(0, 10) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reps, setReps] = useState([])
  const [packages, setPackages] = useState([])

  useEffect(() => {
    supabase.from('sales_reps').select('*').order('name').then(({ data }) => {
      if (data) setReps(data)
    })
    supabase.from('packages').select('*').order('created_at').then(({ data }) => {
      if (data) setPackages(data)
    })
  }, [])

  const selectedPkg = packages.find(p => p.id === packageId)

  async function handleSave() {
    if (!repId) { setError('Please select a sales rep.'); return }
    if (!packageId) { setError('Please select a package.'); return }
    if (!client.trim()) { setError('Please enter a client name.'); return }
    if (!value || parseFloat(value) <= 0) { setError('Deal value must be greater than zero.'); return }

    setLoading(true)
    setError(null)

    const date = closedAt ? new Date(closedAt + 'T12:00:00') : new Date(deal.closed_at)
    const period = getCurrentPeriod(date)
    const month = date.toISOString().slice(0, 7)

    const { error: err } = await supabase.from('deals').update({
      rep_id: repId,
      package_id: packageId,
      package_name: selectedPkg.name,
      client_name: client.trim(),
      value: parseFloat(value),
      points_earned: selectedPkg.points,
      period,
      month,
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
          <h2 style={styles.title}>Edit deal</h2>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Sales rep</label>
          <select style={styles.input} value={repId} onChange={e => { setRepId(e.target.value); setError(null) }}>
            <option value="">Select a rep...</option>
            {reps.map(rep => (
              <option key={rep.id} value={rep.id}>
                {rep.country && COUNTRY_FLAG[rep.country] ? `${COUNTRY_FLAG[rep.country]} ` : ''}{rep.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Package</label>
          <div style={styles.packageGrid}>
            {packages.map(pkg => (
              <button
                key={pkg.id}
                style={{
                  ...styles.pkgOption,
                  ...(packageId === pkg.id ? { ...styles.pkgSelected, borderColor: pkg.color } : {}),
                }}
                onClick={() => { setPackageId(pkg.id); setError(null) }}
              >
                <span style={styles.pkgName}>{pkg.name}</span>
                <span style={{ ...styles.pkgPts, color: pkg.color }}>+{pkg.points} pts</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Client name</label>
          <input
            style={styles.input}
            placeholder="e.g. HSBC, NHS Trust..."
            value={client}
            onChange={e => { setClient(e.target.value); setError(null) }}
          />
        </div>

        <div style={styles.twoCol}>
          <div style={styles.field}>
            <label style={styles.label}>Deal value (£)</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              placeholder="e.g. 45000"
              value={value}
              onChange={e => { setValue(e.target.value); setError(null) }}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Date closed</label>
            <input
              style={styles.input}
              type="date"
              value={closedAt}
              onChange={e => { setClosedAt(e.target.value); setError(null) }}
            />
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : `Save changes${selectedPkg ? ` · ${selectedPkg.points} pts` : ''}`}
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
