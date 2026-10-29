import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase, Expense, LedgerTransaction, Cycle } from '@/lib/supabase'
import { exportToCSV, UnifiedRecord } from '@/lib/export'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'

function ledgerToUnified(tx: LedgerTransaction): UnifiedRecord {
  return {
    id: tx.id, date: tx.date,
    item: tx.note ? `Cash — ${tx.note}` : 'Cash given',
    category: tx.person,
    amount: tx.type === 'returned' ? -tx.amount : tx.amount,
    notes: undefined, source: 'ledger',
  }
}
function expenseToUnified(e: Expense): UnifiedRecord {
  return { id: e.id, date: e.date, item: e.item, category: e.category, amount: e.amount, notes: e.notes, source: 'expense' }
}

const PERSON_COLORS: Record<string, string> = { H: '#7B9E87', S: '#8B7BA8', L: '#C4923A' }

interface CycleWithRecords {
  cycle: Cycle
  records: UnifiedRecord[]
  spent: number
  balance: number
}

export default function History() {
  const [cycleData, setCycleData] = useState<CycleWithRecords[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null)

  useEffect(() => { loadHistory() }, [])

  const loadHistory = async () => {
    setLoading(true)
    // Fetch all past (non-current) cycles, newest first
    const { data: cycles } = await supabase
      .from('cycles')
      .select('*')
      .eq('is_current', false)
      .order('started_at', { ascending: false })

    if (!cycles || cycles.length === 0) { setLoading(false); return }

    const results: CycleWithRecords[] = await Promise.all(
      cycles.map(async (cycle: Cycle) => {
        const [expRes, ledRes] = await Promise.all([
          supabase.from('expenses').select('*').eq('cycle_id', cycle.id).order('date', { ascending: false }),
          supabase.from('ledger_transactions').select('*').eq('cycle_id', cycle.id).order('date', { ascending: false }),
        ])
        const records: UnifiedRecord[] = [
          ...(expRes.data || []).map(expenseToUnified),
          ...(ledRes.data || []).map(ledgerToUnified),
        ].sort((a, b) => b.date.localeCompare(a.date))

        const spent = records.reduce((s, r) => s + r.amount, 0)
        const budget = cycle.opening_balance + cycle.amount_received
        return { cycle, records, spent, balance: budget - spent }
      })
    )

    setCycleData(results)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <PageHeader title="History" subtitle="Past cycles" />

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 60 }}>Loading...</div>
        ) : cycleData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No past cycles yet</div>
            <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              When you receive money and start a new cycle, the previous one will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cycleData.map(({ cycle, records, spent, balance }) => {
              const budget = cycle.opening_balance + cycle.amount_received
              const isExpanded = expandedCycle === cycle.id
              const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
              const barColor = balance < 0 ? '#c0392b' : '#7B9E87'

              // Group records by date for expanded view
              const grouped: Record<string, UnifiedRecord[]> = {}
              records.forEach((r) => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r) })
              const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

              const cycleStart = format(new Date(cycle.started_at), 'd MMM yyyy')
              const cycleEnd = cycle.ended_at ? format(new Date(cycle.ended_at), 'd MMM yyyy') : ''

              return (
                <div key={cycle.id} className="card" style={{ overflow: 'hidden' }}>
                  {/* Cycle header — always visible */}
                  <button
                    onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                    style={{
                      width: '100%', padding: '16px 18px', background: 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                          {cycleStart} — {cycleEnd}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          {records.length} {records.length === 1 ? 'entry' : 'entries'}
                          {cycle.opening_balance > 0 && ` · Rs ${cycle.opening_balance.toLocaleString('en-IN')} carried in`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                            Rs {budget.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: 11, color: balance >= 0 ? '#7B9E87' : '#c0392b', fontWeight: 500 }}>
                            Rs {Math.abs(balance).toLocaleString('en-IN')} {balance >= 0 ? 'saved' : 'over'}
                          </div>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Spent Rs {spent.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{pct.toFixed(0)}% used</span>
                    </div>
                  </button>

                  {/* Expanded records */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {/* Export button */}
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                        <button
                          onClick={() => exportToCSV(records, format(new Date(cycle.started_at), 'yyyy-MM'))}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--bg-3)',
                            color: 'var(--text-2)', cursor: 'pointer', fontSize: 12,
                            fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          Export CSV
                        </button>
                      </div>

                      {records.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                          No records in this cycle
                        </div>
                      ) : (
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {groupedDates.map((date) => {
                            const dayRecords = grouped[date]
                            const dayTotal = dayRecords.reduce((s, r) => s + r.amount, 0)
                            return (
                              <div key={date}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                                    {format(new Date(date + 'T00:00:00'), 'EEEE, d MMM')}
                                  </span>
                                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                    Rs {dayTotal.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div style={{ background: 'var(--bg-3)', borderRadius: 10, overflow: 'hidden' }}>
                                  {dayRecords.map((record, idx) => {
                                    const isLedger = record.source === 'ledger'
                                    const personColor = PERSON_COLORS[record.category]
                                    const isReturned = record.amount < 0
                                    return (
                                      <div key={record.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '11px 14px',
                                        borderBottom: idx < dayRecords.length - 1 ? '1px solid var(--border)' : 'none',
                                      }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                                            {isLedger && (
                                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: `${personColor}25`, color: personColor }}>
                                                {record.category}
                                              </span>
                                            )}
                                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', textTransform: isLedger ? 'none' : 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {record.item}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                                            {isLedger ? (isReturned ? `Returned by ${record.category}` : `Given to ${record.category}`) : record.category}
                                          </div>
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: isReturned ? '#7B9E87' : isLedger ? (personColor || 'var(--text)') : 'var(--text)' }}>
                                          {isReturned ? '+' : ''}Rs {Math.abs(record.amount).toLocaleString('en-IN')}
                                        </span>
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
                  )}
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
