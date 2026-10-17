import { format } from 'date-fns'

export type UnifiedRecord = {
  id: string
  date: string
  item: string
  category: string
  amount: number
  notes?: string
  source: 'expense' | 'ledger'
}

function esc(val: string) {
  return `"${val.replace(/"/g, '""')}"`
}

export function exportToCSV(records: UnifiedRecord[], month: string) {
  // --- Section 1: Category totals ---
  const totals: Record<string, number> = {}
  records.forEach((r) => {
    totals[r.category] = (totals[r.category] || 0) + Number(r.amount)
  })
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

  const summaryHeader = ['Category', 'Total (Rs)']
  const summaryRows = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => [cat, amt.toFixed(2)])
  summaryRows.push(['GRAND TOTAL', grandTotal.toFixed(2)])

  // --- Section 2: All records ---
  const recordHeader = ['Date', 'Item', 'Category', 'Amount (Rs)', 'Notes']
  const recordRows = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => [
      format(new Date(r.date + 'T00:00:00'), 'dd/MM/yyyy'),
      r.item,
      r.category,
      Number(r.amount).toFixed(2),
      r.notes || '',
    ])

  // Build CSV: summary block, blank line, records block
  const lines: string[] = []

  lines.push('MONTHLY SUMMARY')
  lines.push(summaryHeader.map(esc).join(','))
  summaryRows.forEach((row) => lines.push(row.map(esc).join(',')))

  lines.push('')
  lines.push('ALL RECORDS')
  lines.push(recordHeader.map(esc).join(','))
  recordRows.forEach((row) => lines.push(row.map(esc).join(',')))

  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `book-${month}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
