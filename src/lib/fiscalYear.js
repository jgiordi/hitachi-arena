/**
 * Hitachi Financial Year helpers
 * FY starts 1 April, ends 31 March.
 * FY25 = 1 Apr 2025 - 31 Mar 2026
 * FY26 = 1 Apr 2026 - 31 Mar 2027
 *
 * FY label = the year the FY *starts* (April).
 */

/** The calendar year in which the current FY ends (i.e. the March 31 year). */
export function getFYEndYear(date = new Date()) {
  const m = date.getMonth() // 0-indexed
  const y = date.getFullYear()
  return m >= 3 ? y + 1 : y // Apr onward ends next calendar year
}

/** Two-digit FY start year, e.g. 25 for FY25 (Apr 2025 - Mar 2026). */
export function getFYYear(date = new Date()) {
  return (getFYEndYear(date) - 1) % 100
}

/** FY quarter number (1-4): Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar. */
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

/** Prefix for the previous FY, e.g. "FY24-". */
export function getPrevFYPrefix(date = new Date()) {
  return `FY${(getFYYear(date) - 1 + 100) % 100}-`
}

/** Two-digit year label for the previous FY, e.g. 24. */
export function getPrevFYYear(date = new Date()) {
  return (getFYYear(date) - 1 + 100) % 100
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
  const fyEnd = new Date(getFYEndYear(date), 2, 31, 23, 59, 59)
  return Math.max(0, Math.ceil((fyEnd - date) / (1000 * 60 * 60 * 24)))
}
