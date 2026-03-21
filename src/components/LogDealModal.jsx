import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PACKAGES = [
  { id: 'cloud-assessment', name: 'Cloud Assessment', points: 320, color: '#185FA5' },
  { id: 'security-assessment', name: 'Security Assessment', points: 200, color: '#993556' },
  { id: 'data-ai-accelerator', name: 'Data & AI Accelerator', points: 400, color: '#854F0B' },
  { id: 'support-managed', name: 'Support & Managed', points: 150, color: '#3B6D11' },
]

export { PACKAGES }

export default function LogDealModal({ onClose, currentUser }) {
  const [packageId, setPackageId] = useState('')
  const [repId, setRepId] = useState('')
  const [client, setClient] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [reps, setReps] = useState([])

  useEffect(() => {
    supabase.from('sales_reps').select('*').order('name').then(({ data }) => {
      if (data) setReps(data)
    })
  }, [])

  const selectedPkg = PACKAGES.find(p => p.id === packageId)

  async function handleSubmit() {
    if (!packageId || !repId || !client || !value) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError(null)

    const now = new Date()
    const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`
    const month = now.toISOString().slice(0, 7)

    const { error: err } = await supabase.from('deals').insert({
      rep_id: repId,
      logged_by: currentUser?.id || null,
      package_id: packageId,
      package_name: selectedPkg.name,
      client_name: client,
      value: parseFloat(value),
      points_earned: selectedPkg.points,
      period: quarter,
      month,
      closed_at: now.toISOString(),
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(onClose, 1800)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Log a deal</h2>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>

        {success ? (
          <div style={styles.success}>
            <div style={styles.successIcon}>🎉</div>
            <div style={styles.successTitle}>Deal logged!</div>
            <div style={styles.successSub}>+{selectedPkg?.points} points added to your score</div>
          </div>
        ) : (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Sales rep</label>
              <select style={styles.input} value={repId} onChange={e => setRepId(e.target.value)}>
                <option value="">Select a rep...</option>
                {reps.map(rep => (<option key={rep.id} value={rep.id}>{rep.name}</option>))}
              </select>
              {reps.length === 0 && <div style={{fontSize:"12px",color:"var(--text3)",marginTop:"6px"}}>No reps yet — add them in Admin panel.</div>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Package</label>
              <div style={styles.packageGrid}>
                {PACKAGES.map(pkg => (
                  <button
                    key={pkg.id}
                    style={{
                      ...styles.pkgOption,
                      ...(packageId === pkg.id ? { ...styles.pkgSelected, borderColor: pkg.color } : {}),
                    }}
                    onClick={() => setPackageId(pkg.id)}
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
                placeholder="e.g. HSBC, NHS Trust, Rolls Royce..."
                value={client}
                onChange={e => setClient(e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Deal value (£)</label>
              <input
                style={styles.input}
                type="number"
                placeholder="e.g. 45000"
                value={value}
                onChange={e => setValue(e.target.value)}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.footer}>
              <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : `Log deal${selectedPkg ? ` · +${selectedPkg.points} pts` : ''}`}
              </button>
            </div>
          </>
        )}
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
    maxWidth: '480px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border)',
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
  success: {
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
  },
  successIcon: { fontSize: '40px', marginBottom: '12px' },
  successTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' },
  successSub: { fontSize: '14px', color: 'var(--text2)' },
}
