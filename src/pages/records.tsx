import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { supabase, Expense, LedgerTransaction } from '@/lib/supabase'
import { exportToCSV, UnifiedRecord } from '@/lib/export'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import EditModal from '@/components/EditModal'
import Toast from '@/components/Toast'

// Ledger entries are presented as a category named after the person
function ledgerToUnified(tx: LedgerTransaction): UnifiedRecord {
  return {
    id: tx.id,
    date: tx.date,
    item: tx.note ? `Cash to ${tx.person} — ${tx.note}` : `Cash to ${tx.person}`,
    category: tx.person,
    amount: tx.amount,
    notes: undefined,
    source: 'ledger',
  }
}

function expenseToUnified(e: Expense): UnifiedRecord {
  return {
    id: e.id,
    date: e.date,
    item: e.item,
    category: e.category,
    amount: e.amount,
    notes: e.notes,
    source: 'expense',
  }
}

const PERSON_COLORS: Record<string, string> = {
  H: '#7B9E87',
  S: '#8B7BA8',
  L: '#C4923A',
}

export default function Records() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [ledgerTx, setLedgerTx] = useState<LedgerTransaction[]>([])
  const [categories, setCategories] = useState<string[]>(['fruits', 'vegetables', 'others'])
  const [monthOffset, setMonthOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [longPressId, setLongPressId] = useState<string | null>(null)

  const targetDate = subMonths(new Date(), monthOffset)
  const monthLabel = format(targetDate, 'MMMM yyyy')
  const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd')
  const monthKey = format(targetDate, 'yyyy-MM')

  useEffect(() => { loadData() }, [monthOffset]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('app_settings').select('value').eq('key', 'categories').single()
    if (data) setCategories(data.value as string[])
  }

  const loadData = async () => {
    setLoading(true)
    const [expRes, ledRes] = await Promise.all([
      supabase.from('expenses').select('*')
        .gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('ledger_transactions').select('*')
        .gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    setExpenses(expRes.data || [])
    setLedgerTx(ledRes.data || [])
    setLoading(false)
  }

  // Merge and sort all records by date desc
  const allUnified: UnifiedRecord[] = [
    ...expenses.map(expenseToUnified),
    ...ledgerTx.map(ledgerToUnified),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  const filterOptions = ['all', ...categories, 'H', 'S', 'L']
  const filtered = filterCat === 'all' ? allUnified : allUnified.filter((r) => r.category === filterCat)
  const total = filtered.reduce((s, r) => s + Number(r.amount), 0)

  const handleSave = async (id: string, data: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(data).eq('id', id)
    if (error) {
      setToast({ message: 'Could not save changes', type: 'error' })
    } else {
      setToast({ message: 'Record updated', type: 'success' })
      loadData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      setToast({ message: 'Could not delete', type: 'error' })
    } else {
      setToast({ message: 'Record deleted', type: 'success' })
      loadData()
    }
  }

  // Group by date
  const grouped: Record<string, UnifiedRecord[]> = {}
  filtered.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = []
    grouped[r.date].push(r)
  })
  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  let pressTimer: NodeJS.Timeout
  const handlePressStart = (id: string, isLedger: boolean) => {
    if (isLedger) return // ledger entries are not editable here
    pressTimer = setTimeout(() => setLongPressId(id), 600)
  }
  const handlePressEnd = () => clearTimeout(pressTimer)

  const getCategoryLabel = (cat: string) => {
    if (['H', 'S', 'L'].includes(cat)) return `Cash — ${cat}`
    return cat.charAt(0).toUpperCase() + cat.slice(1)
  }

  const getCategoryColor = (cat: string) => {
    return PERSON_COLORS[cat] || undefined
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <EditModal
        expense={editExpense}
        categories={categories}
        onClose={() => { setEditExpense(null); setLongPressId(null) }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <PageHeader
        title="Records"
        subtitle={monthLabel}
        action={
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => exportToCSV(filtered, monthKey)}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Export CSV
            </button>
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-3)',
                color: 'var(--text-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
              disabled={monthOffset === 0}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-3)',
                color: monthOffset === 0 ? 'var(--text-3)' : 'var(--text-2)',
                cursor: monthOffset === 0 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        }
      />

      <div className="page-content with-nav" style={{ paddingTop: 16 }}>
        {/* Month total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', marginBottom: 8,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            Rs {total.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
          {filterOptions.map((cat) => {
            const active = filterCat === cat
            const personColor = getCategoryColor(cat)
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${active ? (personColor || 'var(--accent)') : 'var(--border)'}`,
                  background: active ? (personColor || 'var(--accent)') : 'var(--card)',
                  color: active ? 'white' : 'var(--text-2)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                  textTransform: 'capitalize',
                }}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, textAlign: 'center' }}>
          Hold an expense for 1 second to edit or delete it
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 60 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No entries found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
            {groupedDates.map((date) => {
              const dayRecords = grouped[date]
              const dayTotal = dayRecords.reduce((s, r) => s + Number(r.amount), 0)
              return (
                <div key={date}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 8, padding: '0 2px',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                      {format(new Date(date + 'T00:00:00'), 'EEEE, d MMM')}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      Rs {dayTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="card" style={{ overflow: 'hidden' }}>
                    {dayRecords.map((record, idx) => {
                      const isLedger = record.source === 'ledger'
                      const isLongPressed = longPressId === record.id
                      const personColor = getCategoryColor(record.category)

                      return (
                        <div
                          key={record.id}
                          onMouseDown={() => handlePressStart(record.id, isLedger)}
                          onMouseUp={handlePressEnd}
                          onMouseLeave={handlePressEnd}
                          onTouchStart={() => handlePressStart(record.id, isLedger)}
                          onTouchEnd={handlePressEnd}
                          onClick={() => {
                            if (isLongPressed && !isLedger) {
                              const exp = expenses.find((e) => e.id === record.id)
                              if (exp) setEditExpense(exp)
                            }
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '13px 16px',
                            borderBottom: idx < dayRecords.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isLongPressed ? 'var(--bg-3)' : 'transparent',
                            cursor: isLedger ? 'default' : 'pointer',
                            transition: 'background 0.1s',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                              {isLedger && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 8,
                                  background: `${personColor}25`,
                                  color: personColor,
                                  letterSpacing: '0.03em',
                                }}>
                                  {record.category}
                                </span>
                              )}
                              <span style={{
                                fontSize: 15,
                                fontWeight: 500,
                                color: 'var(--text)',
                                textTransform: isLedger ? 'none' : 'capitalize',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {isLedger ? (record.notes ? `Cash — ${record.notes}` : 'Cash given') : record.item}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                              {isLedger ? `Given to ${record.category}` : getCategoryLabel(record.category)}
                              {!isLedger && record.notes && (
                                <span> · <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{record.notes}</span></span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isLongPressed && !isLedger && (
                              <span style={{ fontSize: 11, color: 'var(--accent)' }}>Tap to edit</span>
                            )}
                            <span style={{
                              fontSize: 15, fontWeight: 600,
                              color: isLedger ? (personColor || 'var(--text)') : 'var(--text)',
                              letterSpacing: '-0.01em',
                            }}>
                              Rs {Number(record.amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
