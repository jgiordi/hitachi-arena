import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentFYPrefix, getPrevFYPrefix, getFYYear } from '../lib/fiscalYear'

const SEGMENT_FLAG = {
  'UK Commercial': '🇬🇧',
  'UK Government': '🇬🇧',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'LTS': '🌐',
}

const SEGMENT_LABELS = {
  'UK Commercial': 'UK Commercial',
  'UK Government': 'UK Government',
  'France': 'FR',
  'Germany': 'DE',
  'LTS': 'LTS',
}

// Scoring Rules (per official Cloud Cup Scoring Model)
const SCORING = {
  FY25_ASSESSMENT: 25,      // Cloud Assessment closed (FY25)
  FY26_ASSESSMENT: 100,     // Cloud Assessment closed (FY26)
  SECOND_DEAL_BONUS: 25,    // Second assessment sold
  THIRD_PLUS_BONUS: 50,     // Third+ assessments sold (per deal)
  SAME_ACCOUNT_BONUS: 25,   // Multiple assessments, same account
  NET_NEW_LOGO: 75,         // Net new logo assessment sale
  TWO_IN_QUARTER: 50,       // Two deals closed within a quarter
  PIPELINE_50K_100K: 25,    // £50k–£100k pipeline created
  PIPELINE_100K_250K: 50,   // £100k–£250k pipeline created
  PIPELINE_250K_PLUS: 100,  // £250k+ pipeline created
}

export default function BreakdownPage() {
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBreakdown()
  }, [])

  async function fetchBreakdown() {
    setLoading(true)

    const currentFYPrefix = getCurrentFYPrefix()
    const prevFYPrefix = getPrevFYPrefix()
    const currentFY = getFYYear()
    const prevFY = (currentFY - 1 + 100) % 100

    // Fetch all sales reps
    const { data: salesReps } = await supabase
      .from('sales_reps')
      .select('*')
      .order('name')

    if (!salesReps || salesReps.length === 0) {
      setSellers([])
      setLoading(false)
      return
    }

    // Fetch all deals with scoring details
    const { data: deals } = await supabase
      .from('deals')
      .select('*')

    // Process each seller's breakdown
    const breakdown = salesReps.map(rep => {
      const repDeals = deals?.filter(d => d.rep_id === rep.id) || []
      
      // FY25 and FY26 Assessments
      const fy25Deals = repDeals.filter(d => d.period?.startsWith(`FY${prevFY}-`) && d.package_id === 'cloud-assessment')
      const fy26Deals = repDeals.filter(d => d.period?.startsWith(`FY${currentFY}-`) && d.package_id === 'cloud-assessment')
      
      const fy25Assessments = fy25Deals.length
      const fy26Assessments = fy26Deals.length
      const totalAssessments = fy25Assessments + fy26Assessments

      // Calculate bonuses
      const secondDealBonus = totalAssessments >= 2 ? 1 : 0
      const thirdPlusBonus = Math.max(0, totalAssessments - 2)
      
      // Multiple assessments same account
      const accountCounts = {}
      repDeals.filter(d => d.package_id === 'cloud-assessment').forEach(d => {
        // Use client_name as account identifier (if we had account_id, use that)
        const account = d.account_id || d.client_name || 'unknown'
        accountCounts[account] = (accountCounts[account] || 0) + 1
      })
      const sameAccountBonuses = Object.values(accountCounts).filter(c => c > 1).reduce((sum, c) => sum + (c - 1), 0)
      
      // Net new logo (check is_net_new flag or infer from data)
      const netNewLogos = repDeals.filter(d => d.is_net_new).length
      
      // Two deals in quarter
      const quarterCounts = {}
      repDeals.filter(d => d.package_id === 'cloud-assessment').forEach(d => {
        const quarter = d.period || 'unknown'
        quarterCounts[quarter] = (quarterCounts[quarter] || 0) + 1
      })
      const twoInQuarterBonuses = Object.values(quarterCounts).filter(c => c >= 2).length

      // Pipeline bonuses (based on deal value tiers)
      let pipeline50k = 0, pipeline100k = 0, pipeline250k = 0
      repDeals.forEach(d => {
        const val = d.value || 0
        if (val >= 250000) pipeline250k++
        else if (val >= 100000) pipeline100k++
        else if (val >= 50000) pipeline50k++
      })

      // Calculate total points
      const points = {
        fy25Assessments: fy25Assessments * SCORING.FY25_ASSESSMENT,
        fy26Assessments: fy26Assessments * SCORING.FY26_ASSESSMENT,
        secondDealBonus: secondDealBonus * SCORING.SECOND_DEAL_BONUS,
        thirdPlusBonus: thirdPlusBonus * SCORING.THIRD_PLUS_BONUS,
        sameAccountBonus: sameAccountBonuses * SCORING.SAME_ACCOUNT_BONUS,
        netNewLogo: netNewLogos * SCORING.NET_NEW_LOGO,
        twoInQuarter: twoInQuarterBonuses * SCORING.TWO_IN_QUARTER,
        pipeline50k: pipeline50k * SCORING.PIPELINE_50K_100K,
        pipeline100k: pipeline100k * SCORING.PIPELINE_100K_250K,
        pipeline250k: pipeline250k * SCORING.PIPELINE_250K_PLUS,
      }

      const totalPoints = Object.values(points).reduce((sum, p) => sum + p, 0)

      return {
        id: rep.id,
        name: rep.name,
        segment: rep.segment || 'UK Commercial',
        counts: {
          fy25Assessments,
          fy26Assessments,
          secondDealBonus,
          thirdPlusBonus,
          sameAccountBonuses,
          netNewLogos,
          twoInQuarterBonuses,
          pipeline50k,
          pipeline100k,
          pipeline250k,
        },
        points,
        totalPoints,
      }
    })

    // Sort by total points descending
    breakdown.sort((a, b) => b.totalPoints - a.totalPoints)
    setSellers(breakdown)
    setLoading(false)
  }

  if (loading) {
    return <div style={styles.loading}>Loading breakdown...</div>
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Points Breakdown</h2>
      <p style={styles.sub}>
        Full transparency on how each seller's points are calculated. Columns show individual scoring components.
      </p>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2 }}>Seller</th>
              <th style={styles.th}>FY25 Assessments</th>
              <th style={styles.th}>FY26 Assessments</th>
              <th style={styles.th}>2nd Deal Bonus</th>
              <th style={styles.th}>3rd+ Deal Bonus</th>
              <th style={styles.th}>Same Account</th>
              <th style={styles.th}>Net New Logo</th>
              <th style={styles.th}>2 in Quarter</th>
              <th style={styles.th}>£50k-£100k</th>
              <th style={styles.th}>£100k-£250k</th>
              <th style={styles.th}>£250k+</th>
              <th style={{ ...styles.th, ...styles.thTotal }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller, idx) => (
              <tr key={seller.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td style={{ ...styles.td, ...styles.tdName, position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                  <span style={styles.flag}>{SEGMENT_FLAG[seller.segment] || '🌐'}</span>
                  <span style={styles.sellerName}>{seller.name}</span>
                  <span style={styles.segmentBadge}>{SEGMENT_LABELS[seller.segment] || seller.segment}</span>
                </td>
                <td style={styles.td}>
                  {seller.counts.fy25Assessments > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>{seller.counts.fy25Assessments}</span>
                      <span style={styles.pointVal}>+{seller.points.fy25Assessments}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.fy26Assessments > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>{seller.counts.fy26Assessments}</span>
                      <span style={styles.pointVal}>+{seller.points.fy26Assessments}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.secondDealBonus > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>✓</span>
                      <span style={styles.pointVal}>+{seller.points.secondDealBonus}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.thirdPlusBonus > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>×{seller.counts.thirdPlusBonus}</span>
                      <span style={styles.pointVal}>+{seller.points.thirdPlusBonus}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.sameAccountBonuses > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>×{seller.counts.sameAccountBonuses}</span>
                      <span style={styles.pointVal}>+{seller.points.sameAccountBonus}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.netNewLogos > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>{seller.counts.netNewLogos}</span>
                      <span style={styles.pointVal}>+{seller.points.netNewLogo}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.twoInQuarterBonuses > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>×{seller.counts.twoInQuarterBonuses}</span>
                      <span style={styles.pointVal}>+{seller.points.twoInQuarter}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.pipeline50k > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>{seller.counts.pipeline50k}</span>
                      <span style={styles.pointVal}>+{seller.points.pipeline50k}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.pipeline100k > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>{seller.counts.pipeline100k}</span>
                      <span style={styles.pointVal}>+{seller.points.pipeline100k}</span>
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {seller.counts.pipeline250k > 0 && (
                    <span style={styles.pointCell}>
                      <span style={styles.countVal}>{seller.counts.pipeline250k}</span>
                      <span style={styles.pointVal}>+{seller.points.pipeline250k}</span>
                    </span>
                  )}
                </td>
                <td style={{ ...styles.td, ...styles.tdTotal }}>
                  <strong>{seller.totalPoints.toLocaleString()}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scoring Rules Reference */}
      <div style={styles.scoringSection}>
        <h3 style={styles.scoringTitle}>Cloud Cup Scoring Model</h3>
        <div style={styles.scoringGrid}>
          <div style={styles.scoringCard}>
            <div style={styles.scoringHeader}>Core — Deals</div>
            <div style={styles.scoringRule}>Cloud Assessment closed (FY25): <strong>{SCORING.FY25_ASSESSMENT} pts</strong></div>
            <div style={styles.scoringRule}>Cloud Assessment closed (FY26): <strong>{SCORING.FY26_ASSESSMENT} pts</strong></div>
            <div style={styles.scoringRule}>Second assessment sold: <strong>+{SCORING.SECOND_DEAL_BONUS} bonus</strong></div>
            <div style={styles.scoringRule}>Third+ assessments sold: <strong>+{SCORING.THIRD_PLUS_BONUS} bonus</strong></div>
            <div style={styles.scoringRule}>Multiple assessments, same account: <strong>+{SCORING.SAME_ACCOUNT_BONUS} pts</strong></div>
          </div>
          <div style={styles.scoringCard}>
            <div style={styles.scoringHeader}>Milestones</div>
            <div style={styles.scoringRule}>Net new logo assessment sale: <strong>+{SCORING.NET_NEW_LOGO} bonus</strong></div>
            <div style={styles.scoringRule}>Two deals closed within a quarter: <strong>+{SCORING.TWO_IN_QUARTER} bonus</strong></div>
          </div>
          <div style={styles.scoringCard}>
            <div style={styles.scoringHeader}>Follow-on Pipeline (S2+)</div>
            <div style={styles.scoringRule}>£50k – £100k pipeline created: <strong>{SCORING.PIPELINE_50K_100K} pts</strong></div>
            <div style={styles.scoringRule}>£100k – £250k pipeline created: <strong>{SCORING.PIPELINE_100K_250K} pts</strong></div>
            <div style={styles.scoringRule}>£250k+ pipeline created: <strong>{SCORING.PIPELINE_250K_PLUS} pts</strong></div>
            <div style={{...styles.scoringRule, fontSize: '10px', fontStyle: 'italic', marginTop: '8px', color: 'var(--text3)'}}>
              🌐 France & Germany: Euro values recorded in GBP for equality
            </div>
          </div>
        </div>
        <div style={styles.scoringFooter}>Deals and pipeline logged monthly</div>
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
  tableContainer: {
    overflowX: 'auto',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '1100px',
  },
  headerRow: {
    background: 'var(--surface2)',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'center',
    fontWeight: '500',
    color: 'var(--text3)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  thTotal: {
    background: 'var(--red-light)',
    color: 'var(--red)',
  },
  rowEven: {
    background: '#fff',
  },
  rowOdd: {
    background: 'var(--surface2)',
  },
  td: {
    padding: '10px 12px',
    textAlign: 'center',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  },
  tdName: {
    textAlign: 'left',
    whiteSpace: 'nowrap',
    minWidth: '180px',
  },
  tdTotal: {
    background: 'var(--red-light)',
    color: 'var(--red)',
    fontWeight: '600',
    fontSize: '14px',
  },
  flag: {
    marginRight: '6px',
    fontSize: '14px',
  },
  sellerName: {
    fontWeight: '500',
    color: 'var(--text)',
    marginRight: '8px',
  },
  segmentBadge: {
    fontSize: '9px',
    background: 'var(--border)',
    color: 'var(--text2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  pointCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  countVal: {
    fontSize: '12px',
    color: 'var(--text)',
    fontWeight: '500',
  },
  pointVal: {
    fontSize: '10px',
    color: 'var(--red)',
    fontWeight: '500',
  },
  scoringSection: {
    marginTop: '2rem',
  },
  scoringTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '1rem',
  },
  scoringGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  scoringCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
  },
  scoringHeader: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid var(--border)',
  },
  scoringRule: {
    fontSize: '12px',
    color: 'var(--text2)',
    marginBottom: '4px',
  },
  scoringFooter: {
    marginTop: '1rem',
    fontSize: '11px',
    color: 'var(--text3)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
}
