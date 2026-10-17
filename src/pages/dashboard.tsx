import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { supabase, Expense } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'

const CATEGORY_COLORS: Record<string, string> = {
  fruits: '#7B9E87',
  vegetables: '#5B8FA8',
  others: '#C4923A',
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || '#8B7BA8'
}

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthOffset, setMonthOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  const targetDate = subMonths(new Date(), monthOffset)
  const monthLabel = format(targetDate, 'MMMM yyyy')
  const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd')

  useEffect(() => {
    loadExpenses()
  }, [monthOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadExpenses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  // Category breakdown
  const byCategory: Record<string, number> = {}
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount)
  })
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  // Top items
  const byItem: Record<string, number> = {}
  expenses.forEach((e) => {
    const key = e.item.toLowerCase()
    byItem[key] = (byItem[key] || 0) + Number(e.amount)
  })
  const topItems = Object.entries(byItem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Daily spending for mini chart (last 14 days if current month)
  const dailyMap: Record<string, number> = {}
  expenses.forEach((e) => {
    dailyMap[e.date] = (dailyMap[e.date] || 0) + Number(e.amount)
  })
  const dailyEntries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0]))
  const maxDaily = Math.max(...dailyEntries.map((d) => d[1]), 1)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <PageHeader
        title="Dashboard"
        subtitle={monthLabel}
        action={
          <div style={{ display: 'flex', gap: 4 }}>
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

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 60 }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Total card */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '20px 20px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>
                Total spent in {format(targetDate, 'MMMM')}
              </div>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                  color: 'var(--text)',
                }}
              >
                Rs {total.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {/* Daily bar chart */}
            {dailyEntries.length > 0 && (
              <div
                className="card"
                style={{ padding: '18px 16px', marginBottom: 16 }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 14 }}>
                  Daily spending
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 4,
                    height: 80,
                    overflowX: 'auto',
                    paddingBottom: 24,
                    position: 'relative',
                  }}
                >
                  {dailyEntries.map(([day, amt]) => (
                    <div
                      key={day}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        flex: '0 0 auto',
                        minWidth: 28,
                      }}
                    >
                      <div
                        title={`Rs ${amt}`}
                        style={{
                          width: 20,
                          height: Math.max(4, (amt / maxDaily) * 70),
                          background: 'var(--accent)',
                          borderRadius: '4px 4px 2px 2px',
                          opacity: 0.85,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 9,
                          color: 'var(--text-3)',
                          position: 'absolute',
                          bottom: 0,
                          width: 28,
                          textAlign: 'center',
                        }}
                      >
                        {format(new Date(day + 'T00:00:00'), 'd')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {categoryEntries.length > 0 && (
              <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 14 }}>
                  By category
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {categoryEntries.map(([cat, amt]) => {
                    const pct = total > 0 ? (amt / total) * 100 : 0
                    return (
                      <div key={cat}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: getCategoryColor(cat),
                              }}
                            />
                            <span
                              style={{
                                fontSize: 14,
                                color: 'var(--text)',
                                textTransform: 'capitalize',
                              }}
                            >
                              {cat}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                              {pct.toFixed(0)}%
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                              Rs {amt.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            height: 5,
                            background: 'var(--bg-3)',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: getCategoryColor(cat),
                              borderRadius: 3,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top items */}
            {topItems.length > 0 && (
              <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 14 }}>
                  Most spent on
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topItems.map(([name, amt], i) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            width: 16,
                            textAlign: 'right',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 15,
                            color: 'var(--text)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {name}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        Rs {amt.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expenses.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 20px',
                  color: 'var(--text-3)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  No entries for {format(targetDate, 'MMMM yyyy')}
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  Add expenses from the home tab
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
