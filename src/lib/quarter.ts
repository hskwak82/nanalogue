// Quarter calculation utilities for quarterly diary management

export interface QuarterInfo {
  year: number
  quarter: 1 | 2 | 3 | 4
}

export interface QuarterDateRange {
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
}

/**
 * Get quarter information from a date
 * Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
 */
export function getQuarterFromDate(date: Date): QuarterInfo {
  const month = date.getMonth() + 1  // 1-12
  const year = date.getFullYear()

  let quarter: 1 | 2 | 3 | 4
  if (month <= 3) quarter = 1
  else if (month <= 6) quarter = 2
  else if (month <= 9) quarter = 3
  else quarter = 4

  return { year, quarter }
}

/**
 * Generate quarter title in Korean format
 * Example: "2025년 1분기"
 */
export function getQuarterTitle(year: number, quarter: number): string {
  return `${year}년 ${quarter}분기`
}

/**
 * Get date range for a quarter
 * Returns start and end dates in YYYY-MM-DD format
 */
export function getQuarterDateRange(year: number, quarter: number): QuarterDateRange {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3

  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`

  // Calculate last day of end month
  const lastDay = new Date(year, endMonth, 0).getDate()
  const end = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`

  return { start, end }
}

/**
 * Get unique quarter key for comparison
 * Example: "2025-Q1"
 */
export function getQuarterKey(date: Date): string {
  const { year, quarter } = getQuarterFromDate(date)
  return `${year}-Q${quarter}`
}

/**
 * Check if two dates are in the same quarter
 */
export function isSameQuarter(date1: Date, date2: Date): boolean {
  const q1 = getQuarterFromDate(date1)
  const q2 = getQuarterFromDate(date2)
  return q1.year === q2.year && q1.quarter === q2.quarter
}

/**
 * Get quarter info from a date string (YYYY-MM-DD)
 */
export function getQuarterFromDateString(dateStr: string): QuarterInfo {
  return getQuarterFromDate(new Date(dateStr))
}
