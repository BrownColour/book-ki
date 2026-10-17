import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { supabase, Expense } from '@/lib/supabase'
import { exportExpensesToCSV } from '@/lib/export'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import EditModal from '@/components/EditModal'
import Toast from '@/components/Toast'

export default function Records() {
  const [expenses, setExpenses] = useState<Expense[]>([])
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

  useEffect(() => {
    loadExpenses()
  }, [monthOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'categories')
      .single()
    if (data) setCategories(data.value as string[])
  }

  const loadExpenses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const filtered = filterCat === 'all' ? expenses : expenses.filter((e) => e.category === filterCat)
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0)

  const handleSave = async (id: string, data: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(data).eq('id', id)
    if (error) {
      setToast({ message: 'Could not save changes', type: 'error' })
    } else {
      setToast({ message: 'Record updated', type: 'success' })
      loadExpenses()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      setToast({ message: 'Could not delete', type: 'error' })
    } else {
      setToast({ message: 'Record deleted', type: 'success' })
      loadExpenses()
    }
  }

  // Group expenses by date
  const grouped: Record<string, Expense[]> = {}
  filtered.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  })
  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Long-press to reveal edit
  let pressTimer: NodeJS.Timeout
  const handlePressStart = (id: string) => {
    pressTimer = setTimeout(() => {
      setLongPressId(id)
    }, 600)
  }
  const handlePressEnd = () => {
    clearTimeout(pressTimer)
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
              onClick={() => exportExpensesToCSV(filtered, monthKey)}
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
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                color: 'var(--text-2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                color: monthOffset === 0 ? 'var(--text-3)' : 'var(--text-2)',
                cursor: monthOffset === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            Rs {total.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Category filter chips */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 8,
          }}
        >
          {['all', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: `1.5px solid ${filterCat === cat ? 'var(--accent)' : 'var(--border)'}`,
                background: filterCat === cat ? 'var(--accent)' : 'var(--card)',
                color: filterCat === cat ? 'white' : 'var(--text-2)',
                fontSize: 13,
                fontWeight: filterCat === cat ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
                textTransform: 'capitalize',
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Edit hint */}
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, textAlign: 'center' }}>
          Hold an item for 1 second to edit or delete it
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
              const dayExpenses = grouped[date]
              const dayTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={date}>
                  {/* Date header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                      padding: '0 2px',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                      {format(new Date(date + 'T00:00:00'), 'EEEE, d MMM')}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      Rs {dayTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Expenses for this date */}
                  <div
                    className="card"
                    style={{ overflow: 'hidden' }}
                  >
                    {dayExpenses.map((expense, idx) => {
                      const isLongPressed = longPressId === expense.id
                      return (
                        <div
                          key={expense.id}
                          onMouseDown={() => handlePressStart(expense.id)}
                          onMouseUp={handlePressEnd}
                          onMouseLeave={handlePressEnd}
                          onTouchStart={() => handlePressStart(expense.id)}
                          onTouchEnd={handlePressEnd}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '13px 16px',
                            borderBottom: idx < dayExpenses.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isLongPressed ? 'var(--bg-3)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                          }}
                          onClick={() => {
                            if (isLongPressed) {
                              setEditExpense(expense)
                            }
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 500,
                                color: 'var(--text)',
                                textTransform: 'capitalize',
                                marginBottom: 2,
                              }}
                            >
                              {expense.item}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: 'var(--text-3)',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {expense.category}
                              </span>
                              {expense.notes && (
                                <>
                                  <span style={{ fontSize: 11, color: 'var(--border)' }}>·</span>
                                  <span style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                                    {expense.notes}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isLongPressed && (
                              <span style={{ fontSize: 11, color: 'var(--accent)' }}>Tap to edit</span>
                            )}
                            <span
                              style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: 'var(--text)',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              Rs {Number(expense.amount).toLocaleString('en-IN')}
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
