import { Expense } from './supabase'
import { format } from 'date-fns'

export function exportExpensesToCSV(expenses: Expense[], month: string) {
  const headers = ['Date', 'Item', 'Category', 'Amount (Rs)', 'Notes']
  const rows = expenses.map((e) => [
    format(new Date(e.date), 'dd/MM/yyyy'),
    e.item,
    e.category,
    e.amount.toString(),
    e.notes || '',
  ])

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  rows.push(['', '', 'TOTAL', total.toString(), ''])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `book-expenses-${month}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
