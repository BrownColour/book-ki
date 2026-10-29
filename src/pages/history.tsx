import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
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

type ViewMode = 'cycles' | 'monthly'

interface CycleBlock {
  kind: 'cycle'
  id: string
  label: string
  sublabel: string
  budget: number
  spent: number
  balance: number
  records: UnifiedRecord[]
  exportKey: string
}

interface MonthBlock {
  kind: 'month'
  id: string
  label: string
  spent: number
  records: UnifiedRecord[]
  exportKey: string
}

type Block = CycleBlock | MonthBlock

export default function History() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('cycles')

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    setLoading(true)

    // Fetch everything
    const [expRes, ledRes, cycleRes] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('ledger_transactions').select('*').order('date', { ascending: false }),
      supabase.from('cycles').select('*').order('started_at', { ascending: false }),
    ])

    const allExpenses: Expense[] = expRes.data || []
    const allLedger: LedgerTransaction[] = ledRes.data || []
    const allCycles: Cycle[] = cycleRes.data || []

    const allRecords: UnifiedRecord[] = [
      ...allExpenses.map(expenseToUnified),
      ...allLedger.map(ledgerToUnified),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

    // ── Cycle view ─────────────────────────────────────────────────────────
    const cycleBlocks: CycleBlock[] = []

    // Records with no cycle_id — group as a legacy block if any exist
    const legacyExp = allExpenses.filter((e) => !(e as Expense & { cycle_id?: string }).cycle_id)
    const legacyLed = allLedger.filter((t) => !(t as LedgerTransaction & { cycle_id?: string }).cycle_id)
    const legacyRecords: UnifiedRecord[] = [
      ...legacyExp.map(expenseToUnified),
      ...legacyLed.map(ledgerToUnified),
    ].sort((a, b) => b.date.localeCompare(a.date))

    if (legacyRecords.length > 0) {
      const spent = legacyRecords.reduce((s, r) => s + r.amount, 0)
      const dates = legacyRecords.map((r) => r.date).sort()
      cycleBlocks.push({
        kind: 'cycle', id: 'legacy',
        label: 'Before cycles',
        sublabel: `${format(new Date(dates[0] + 'T00:00:00'), 'd MMM yyyy')} — ${format(new Date(dates[dates.length - 1] + 'T00:00:00'), 'd MMM yyyy')}`,
        budget: 0, spent, balance: -spent,
        records: legacyRecords,
        exportKey: 'legacy',
      })
    }

    // Named cycles (past + current)
    for (const cycle of allCycles) {
      const cycleExp = allExpenses.filter((e) => (e as Expense & { cycle_id?: string }).cycle_id === cycle.id)
      const cycleLed = allLedger.filter((t) => (t as LedgerTransaction & { cycle_id?: string }).cycle_id === cycle.id)
      const records: UnifiedRecord[] = [
        ...cycleExp.map(expenseToUnified),
        ...cycleLed.map(ledgerToUnified),
      ].sort((a, b) => b.date.localeCompare(a.date))

      const spent = records.reduce((s, r) => s + r.amount, 0)
      const budget = cycle.opening_balance + cycle.amount_received
      const started = format(new Date(cycle.started_at), 'd MMM yyyy')
      const ended = cycle.ended_at ? format(new Date(cycle.ended_at), 'd MMM yyyy') : 'ongoing'

      cycleBlocks.push({
        kind: 'cycle', id: cycle.id,
        label: cycle.is_current ? `Current cycle (${started})` : `${started} — ${ended}`,
        sublabel: cycle.opening_balance > 0
          ? `Rs ${cycle.opening_balance.toLocaleString('en-IN')} carried in · ${records.length} entries`
          : `${records.length} entries`,
        budget, spent, balance: budget - spent,
        records,
        exportKey: format(new Date(cycle.started_at), 'yyyy-MM'),
      })
    }

    // ── Month view ─────────────────────────────────────────────────────────
    // Find date range of all records
    const monthBlocks: MonthBlock[] = []
    if (allRecords.length > 0) {
      const oldest = allRecords[allRecords.length - 1].date
      const newest = allRecords[0].date
      let cursor = new Date(newest + 'T00:00:00')
      const end = new Date(oldest + 'T00:00:00')

      while (cursor >= end) {
        const mStart = format(startOfMonth(cursor), 'yyyy-MM-dd')
        const mEnd = format(endOfMonth(cursor), 'yyyy-MM-dd')
        const monthRecords = allRecords.filter((r) => r.date >= mStart && r.date <= mEnd)

        if (monthRecords.length > 0) {
          const spent = monthRecords.reduce((s, r) => s + r.amount, 0)
          monthBlocks.push({
            kind: 'month', id: mStart,
            label: format(cursor, 'MMMM yyyy'),
            spent, records: monthRecords,
            exportKey: format(cursor, 'yyyy-MM'),
          })
        }
        cursor = subMonths(cursor, 1)
      }
    }

    setBlocks(viewMode === 'cycles' ? cycleBlocks : monthBlocks)
    // store both for switching without reload
    ;(window as Window & { _cycleBlocks?: Block[]; _monthBlocks?: Block[] })._cycleBlocks = cycleBlocks
    ;(window as Window & { _cycleBlocks?: Block[]; _monthBlocks?: Block[] })._monthBlocks = monthBlocks
    setLoading(false)
  }

  const switchMode = (mode: ViewMode) => {
    setViewMode(mode)
    setExpandedId(null)
    const w = window as Window & { _cycleBlocks?: Block[]; _monthBlocks?: Block[] }
    if (mode === 'cycles' && w._cycleBlocks) setBlocks(w._cycleBlocks)
    if (mode === 'monthly' && w._monthBlocks) setBlocks(w._monthBlocks)
  }

  const renderRecords = (records: UnifiedRecord[]) => {
    const grouped: Record<string, UnifiedRecord[]> = {}
    records.forEach((r) => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r) })
    const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

    return (
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
                          {!isLedger && record.notes && ` · ${record.notes}`}
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
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <PageHeader title="History" subtitle="All transactions" />

      <div className="page-content with-nav" style={{ paddingTop: 16 }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {(['cycles', 'monthly'] as ViewMode[]).map((mode) => (
            <button key={mode} onClick={() => switchMode(mode)} style={{
              flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
              background: viewMode === mode ? 'var(--accent)' : 'transparent',
              color: viewMode === mode ? 'white' : 'var(--text-2)',
              fontSize: 13, fontWeight: viewMode === mode ? 600 : 400,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              textTransform: 'capitalize', transition: 'all 0.15s',
            }}>
              {mode === 'cycles' ? 'By cycle' : 'By month'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 60 }}>Loading...</div>
        ) : blocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No records yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blocks.map((block) => {
              const isExpanded = expandedId === block.id
              const isCycle = block.kind === 'cycle'

              return (
                <div key={block.id} className="card" style={{ overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : block.id)}
                    style={{ width: '100%', padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isCycle && block.budget > 0 ? 10 : 0 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                          {block.label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          {isCycle ? block.sublabel : `${block.records.length} entries`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          {isCycle && block.budget > 0 ? (
                            <>
                              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                                Rs {block.budget.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 500, color: block.balance >= 0 ? '#7B9E87' : '#c0392b' }}>
                                Rs {Math.abs(block.balance).toLocaleString('en-IN')} {block.balance >= 0 ? 'saved' : 'over'}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                              Rs {Math.abs(block.spent).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {/* Progress bar for cycles with a budget */}
                    {isCycle && block.budget > 0 && (
                      <>
                        <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (block.spent / block.budget) * 100)}%`,
                            background: block.balance < 0 ? '#c0392b' : '#7B9E87',
                            borderRadius: 3,
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Spent Rs {block.spent.toLocaleString('en-IN')}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.min(100, (block.spent / block.budget) * 100).toFixed(0)}% used</span>
                        </div>
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                        <button
                          onClick={() => exportToCSV(block.records, block.exportKey)}
                          style={{
                            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                            background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer',
                            fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          Export CSV
                        </button>
                      </div>
                      {block.records.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                          No records
                        </div>
                      ) : renderRecords(block.records)}
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
