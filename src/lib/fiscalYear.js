/**
 * Hitachi Financial Year helpers
 * FY starts 1 April, ends 31 March.
 * FY25 = 1 Apr 2025 – 31 Mar 2026
 * FY26 = 1 Apr 2026 – 31 Mar 2027
 *
 * FY label = the year the FY *starts* (April).
 */

/** The calendar year in which the current FY ends (i.e. the March 31 year). */
export function getFYEndYear(date = new Date()) {
  const m = date.getMonth() // 0-indexed
  const y = date.getFullYear()
  return m >= 3 ? y + 1 : y // Apr onward → ends next calendar year
}

/** Two-digit FY start year, e.g. 25 for FY25 (Apr 2025 – Mar 2026). */
export function getFYYear(date = new Date()) {
  return (getFYEndYear(date) - 1) % 100
}

/** FY quarter number (1–4): Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar. */
export function getFYQuarter(date = new Date()) {
  return Math.floor(((date.getMonth() - 3 + 12) % 12) / 3) + 1
}

/** Period string stored on deals, e.g. "FY25-Q4". */
export function getCurrentPeriod(date = new Date()) {
  return `FY${getFYYear(date)}-Q${getFYQuarter(date)}`
}

/** Prefix used to filter all deals in the current FY, e.g. "FY25-". */
export function getCurrentFYPrefix(date = new Date()) {
  return `FY${getFYYear(date)}-`
}

/** Current month string, e.g. "2026-03". */
export function getCurrentMonth(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

/** Short label shown in the UI, e.g. "FY25". */
export function getCurrentPeriodLabel(date = new Date()) {
  return `FY${getFYYear(date)}`
}

/** Days remaining until end of the current FY (March 31). */
export function getDaysLeftInFY(date = new Date()) {
  const fyEnd = new Date(getFYEndYear(date), 2, 31, 23, 59, 59) // March 31
  return Math.max(0, Math.ceil((fyEnd - date) / (1000 * 60 * 60 * 24)))
}


/** Returns the FY quarter number (1–4) for a given Date */
export function getFYQuarter(date = new Date()) {
  const m = date.getMonth()
  // Shift so Apr=0, then divide into quarters
  return Math.floor(((m - 3 + 12) % 12) / 3) + 1
}

/** Returns the period string, e.g. "FY25-Q4" */
export function getCurrentPeriod(date = new Date()) {
  return `FY${getFYYear(date)}-Q${getFYQuarter(date)}`
}

/** Returns the current month string, e.g. "2026-03" */
export function getCurrentMonth(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

/** Returns the label shown in the header/stats bar, e.g. "FY25 Q4" */
export function getCurrentPeriodLabel(date = new Date()) {
  return `FY${getFYYear(date)} Q${getFYQuarter(date)}`
}

/** Returns the end date (midnight) of the current FY quarter */
export function getCurrentQuarterEnd(date = new Date()) {
  const q = getFYQuarter(date)
  const fy = getFYYear(date)
  // Reconstruct the 4-digit end year from FY year
  // FY year = (calendar year + 1) % 100  when month >= Apr
  // so 4-digit year for FY end (March) = 2000 + fyYear if fyYear < current 2-digit, else same century
  const century = Math.floor(date.getFullYear() / 100) * 100
  const fyEndYear = century + fy // e.g. 2026 for FY25

  // Quarter end months (0-indexed, last day):
  // Q1 ends Jun 30  → month 6, day 0  = last day of Jun
  // Q2 ends Sep 30  → month 9, day 0
  // Q3 ends Dec 31  → month 12, day 0
  // Q4 ends Mar 31  → month 3, day 0  (using fyEndYear)
  const endMonths = { 1: [fyEndYear - 1, 6], 2: [fyEndYear - 1, 9], 3: [fyEndYear - 1, 12], 4: [fyEndYear, 3] }
  const [year, endMonth] = endMonths[q]
  return new Date(year, endMonth, 0) // day 0 = last day of previous month
}

/** Days remaining in the current FY quarter */
export function getDaysLeftInQuarter(date = new Date()) {
  const end = getCurrentQuarterEnd(date)
  return Math.max(0, Math.ceil((end - date) / (1000 * 60 * 60 * 24)))
}
