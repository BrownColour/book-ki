import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { supabase, Expense, LedgerTransaction } from '@/lib/supabase'
import { exportToCSV, UnifiedRecord } from '@/lib/export'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import EditModal from '@/components/EditModal'
import Toast from '@/components/Toast'

function ledgerToUnified(tx: LedgerTransaction): UnifiedRecord {
  return {
    id: tx.id,
    date: tx.date,
    item: tx.note ? `Cash — ${tx.note}` : 'Cash given',
    category: tx.person,
    amount: tx.type === 'returned' ? -tx.amount : tx.amount,
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

// ── Ledger edit sheet ──────────────────────────────────────────────────────
interface LedgerEditSheetProps {
  tx: LedgerTransaction | null
  onClose: () => void
  onSave: (id: string, data: Partial<LedgerTransaction>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type LedgerStep = 'confirm' | 'edit'

function LedgerEditSheet({ tx, onClose, onSave, onDelete }: LedgerEditSheetProps) {
  const [step, setStep] = useState<LedgerStep>('confirm')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (tx) {
      setAmount(tx.amount.toString())
      setNote(tx.note || '')
      setDate(tx.date)
      setStep('confirm')
      setShowDeleteConfirm(false)
    }
  }, [tx])

  if (!tx) return null
  const color = PERSON_COLORS[tx.person] || 'var(--accent)'

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setSaving(true)
    await onSave(tx.id, { amount: parseFloat(amount), note: note.trim() || undefined, date })
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    setSaving(true)
    await onDelete(tx.id)
    setSaving(false)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: 'var(--card)', borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        {step === 'confirm' ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>Edit this entry?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
              You are about to edit a cash entry for <strong style={{ color }}>{tx.person}</strong> — Rs {tx.amount}. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>No, go back</button>
              <button className="btn-primary" onClick={() => setStep('edit')} style={{ flex: 1 }}>Yes, edit</button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color }}>Edit — {tx.person}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 20px' }}>
              {format(new Date(tx.date + 'T00:00:00'), 'd MMMM yyyy')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Amount (Rs)</label>
                <input type="number" className="input-field" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="0" inputMode="numeric"
                  style={{ fontSize: 20, fontWeight: 600 }} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input type="text" className="input-field" value={note}
                  onChange={(e) => setNote(e.target.value)} placeholder="Daily sabzi, market, etc." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !amount}
                style={{ flex: 2, opacity: saving || !amount ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} style={{
                marginTop: 12, width: '100%', padding: '12px', border: '1px solid #c0392b',
                borderRadius: 10, background: 'transparent', color: '#c0392b',
                fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>Delete entry</button>
            ) : (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 10, border: '1px solid #c0392b', background: '#c0392b18' }}>
                <p style={{ fontSize: 13, color: '#c0392b', margin: '0 0 10px', fontWeight: 500 }}>
                  This will permanently delete this entry. Cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowDeleteConfirm(false)} style={{
                    flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--bg-3)', color: 'var(--text)', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}>Cancel</button>
                  <button onClick={handleDelete} disabled={saving} style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: 8,
                    background: '#c0392b', color: 'white', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.7 : 1,
                  }}>{saving ? 'Deleting...' : 'Yes, delete'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Records() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [ledgerTx, setLedgerTx] = useState<LedgerTransaction[]>([])
  const [categories, setCategories] = useState<string[]>(['fruits', 'vegetables', 'others'])
  const [monthOffset, setMonthOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editLedger, setEditLedger] = useState<LedgerTransaction | null>(null)
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
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'categories').single()
    if (data) setCategories(data.value as string[])
  }

  const loadData = async () => {
    setLoading(true)
    const [expRes, ledRes] = await Promise.all([
      supabase.from('expenses').select('*')
        .gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('ledger_transactions').select('*')
        .gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setExpenses(expRes.data || [])
    setLedgerTx(ledRes.data || [])
    setLoading(false)
  }

  const allUnified: UnifiedRecord[] = [
    ...expenses.map(expenseToUnified),
    ...ledgerTx.map(ledgerToUnified),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  const filterOptions = ['all', ...categories, 'H', 'S', 'L']
  const filtered = filterCat === 'all' ? allUnified : allUnified.filter((r) => r.category === filterCat)

  // Net outflow: expenses + ledger given - ledger returned
  const netTotal = filtered.reduce((s, r) => s + r.amount, 0)

  const handleSaveExpense = async (id: string, data: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(data).eq('id', id)
    if (error) { setToast({ message: 'Could not save changes', type: 'error' }) }
    else { setToast({ message: 'Record updated', type: 'success' }); loadData() }
  }
  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { setToast({ message: 'Could not delete', type: 'error' }) }
    else { setToast({ message: 'Record deleted', type: 'success' }); loadData() }
  }
  const handleSaveLedger = async (id: string, data: Partial<LedgerTransaction>) => {
    const { error } = await supabase.from('ledger_transactions').update(data).eq('id', id)
    if (error) { setToast({ message: 'Could not save changes', type: 'error' }) }
    else { setToast({ message: 'Entry updated', type: 'success' }); loadData() }
  }
  const handleDeleteLedger = async (id: string) => {
    const { error } = await supabase.from('ledger_transactions').delete().eq('id', id)
    if (error) { setToast({ message: 'Could not delete', type: 'error' }) }
    else { setToast({ message: 'Entry deleted', type: 'success' }); loadData() }
  }

  const grouped: Record<string, UnifiedRecord[]> = {}
  filtered.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = []
    grouped[r.date].push(r)
  })
  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  let pressTimer: NodeJS.Timeout
  const handlePressStart = (id: string) => { pressTimer = setTimeout(() => setLongPressId(id), 600) }
  const handlePressEnd = () => clearTimeout(pressTimer)

  const openEdit = (record: UnifiedRecord) => {
    setLongPressId(null)
    if (record.source === 'expense') {
      const exp = expenses.find((e) => e.id === record.id)
      if (exp) setEditExpense(exp)
    } else {
      const tx = ledgerTx.find((t) => t.id === record.id)
      if (tx) setEditLedger(tx)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <EditModal expense={editExpense} categories={categories}
        onClose={() => setEditExpense(null)} onSave={handleSaveExpense} onDelete={handleDeleteExpense} />
      <LedgerEditSheet tx={editLedger} onClose={() => setEditLedger(null)}
        onSave={handleSaveLedger} onDelete={handleDeleteLedger} />

      <PageHeader title="Records" subtitle={monthLabel} action={
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => exportToCSV(filtered, monthKey)} style={{
            height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
          }}>Export CSV</button>
          <button onClick={() => setMonthOffset((o) => o + 1)} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={() => setMonthOffset((o) => Math.max(0, o - 1))} disabled={monthOffset === 0} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-3)', color: monthOffset === 0 ? 'var(--text-3)' : 'var(--text-2)',
            cursor: monthOffset === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      } />

      <div className="page-content with-nav" style={{ paddingTop: 16 }}>
        {/* Net total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', marginBottom: 8,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · net outflow
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            Rs {netTotal.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
          {filterOptions.map((cat) => {
            const active = filterCat === cat
            const personColor = PERSON_COLORS[cat]
            return (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: '7px 14px', borderRadius: 20, flex: '0 0 auto',
                border: `1.5px solid ${active ? (personColor || 'var(--accent)') : 'var(--border)'}`,
                background: active ? (personColor || 'var(--accent)') : 'var(--card)',
                color: active ? 'white' : 'var(--text-2)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                whiteSpace: 'nowrap', textTransform: 'capitalize',
              }}>
                {cat === 'all' ? 'All' : cat}
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, textAlign: 'center' }}>
          Hold any entry for 1 second to edit or delete it
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
              // Day total is also net (returned entries have negative amount)
              const dayTotal = dayRecords.reduce((s, r) => s + r.amount, 0)
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
                      const personColor = PERSON_COLORS[record.category]
                      // For display, always show the raw positive amount with a sign label
                      const rawTx = isLedger ? ledgerTx.find((t) => t.id === record.id) : null
                      const isReturned = rawTx?.type === 'returned'

                      return (
                        <div
                          key={record.id}
                          onMouseDown={() => handlePressStart(record.id)}
                          onMouseUp={handlePressEnd}
                          onMouseLeave={handlePressEnd}
                          onTouchStart={() => handlePressStart(record.id)}
                          onTouchEnd={handlePressEnd}
                          onClick={() => { if (isLongPressed) openEdit(record) }}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '13px 16px',
                            borderBottom: idx < dayRecords.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isLongPressed ? 'var(--bg-3)' : 'transparent',
                            cursor: 'pointer', transition: 'background 0.1s',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                              {isLedger && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                                  letterSpacing: '0.03em',
                                  background: `${personColor}25`, color: personColor,
                                }}>
                                  {record.category}
                                </span>
                              )}
                              <span style={{
                                fontSize: 15, fontWeight: 500, color: 'var(--text)',
                                textTransform: isLedger ? 'none' : 'capitalize',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {record.item}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                              {isLedger
                                ? isReturned ? `Returned by ${record.category}` : `Given to ${record.category}`
                                : record.category}
                              {!isLedger && record.notes && ` · ${record.notes}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isLongPressed && (
                              <span style={{ fontSize: 11, color: 'var(--accent)' }}>Tap to edit</span>
                            )}
                            <span style={{
                              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
                              color: isReturned ? '#7B9E87' : isLedger ? (personColor || 'var(--text)') : 'var(--text)',
                            }}>
                              {isReturned ? '+' : ''}Rs {Math.abs(Number(rawTx?.amount ?? record.amount)).toLocaleString('en-IN')}
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
