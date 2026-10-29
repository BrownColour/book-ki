import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase, Cycle } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import AutocorrectInput from '@/components/AutocorrectInput'
import Toast from '@/components/Toast'

interface ItemRow { name: string; amount: string }

export default function AddExpense() {
  const [items, setItems] = useState<ItemRow[]>([{ name: '', amount: '' }])
  const [category, setCategory] = useState('vegetables')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categories, setCategories] = useState(['fruits', 'vegetables', 'others'])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [cycleSpent, setCycleSpent] = useState(0)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [receiveAmount, setReceiveAmount] = useState('')
  const [receiveSaving, setReceiveSaving] = useState(false)

  const loadCycle = useCallback(async () => {
    const { data: cycleData } = await supabase
      .from('cycles').select('*').eq('is_current', true).single()
    if (!cycleData) return
    setCycle(cycleData)

    // Sum all expenses + net ledger in this cycle
    const [expRes, ledRes] = await Promise.all([
      supabase.from('expenses').select('amount').eq('cycle_id', cycleData.id),
      supabase.from('ledger_transactions').select('amount, type').eq('cycle_id', cycleData.id),
    ])
    const expTotal = (expRes.data || []).reduce((s, e) => s + Number(e.amount), 0)
    const ledNet = (ledRes.data || []).reduce((s, t) =>
      s + (t.type === 'returned' ? -Number(t.amount) : Number(t.amount)), 0)
    setCycleSpent(expTotal + ledNet)
  }, [])

  useEffect(() => {
    loadCategories()
    loadCycle()
  }, [loadCycle])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('app_settings').select('value').eq('key', 'categories').single()
    if (data) {
      setCategories(data.value as string[])
      setCategory((data.value as string[])[0] || 'others')
    }
  }

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }
  const addItemRow = () => setItems((prev) => [...prev, { name: '', amount: '' }])
  const removeItemRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const totalAmount = items.reduce((sum, row) => {
    const val = parseFloat(row.amount)
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
  const hasValidItem = items.some((row) => row.name.trim().length > 0)
  const canSubmit = hasValidItem && totalAmount > 0

  const handleSubmit = async () => {
    if (!canSubmit || !cycle) { setToast({ message: 'Please fill in items and amounts', type: 'error' }); return }
    setSaving(true)
    const filledItems = items.filter((r) => r.name.trim()).map((r) => r.name.trim())
    const { error } = await supabase.from('expenses').insert({
      item: filledItems.join(', '),
      amount: totalAmount,
      category,
      notes: notes.trim() || null,
      date,
      cycle_id: cycle.id,
    })
    setSaving(false)
    if (error) {
      setToast({ message: 'Could not save. Try again.', type: 'error' })
    } else {
      setToast({ message: `Saved: ${filledItems.join(', ')} — Rs ${totalAmount}`, type: 'success' })
      setItems([{ name: '', amount: '' }])
      setNotes('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      loadCycle()
    }
  }

  // Receive money: close current cycle, open new one with carryover
  const handleReceiveMoney = async () => {
    const received = parseFloat(receiveAmount)
    if (!received || received <= 0) { setToast({ message: 'Enter a valid amount', type: 'error' }); return }
    if (!cycle) return
    setReceiveSaving(true)

    const currentBalance = cycle.opening_balance + cycle.amount_received - cycleSpent
    const newOpeningBalance = currentBalance > 0 ? currentBalance : 0

    // Close current cycle
    await supabase.from('cycles').update({ is_current: false, ended_at: new Date().toISOString() }).eq('id', cycle.id)

    // Open new cycle
    const { error } = await supabase.from('cycles').insert({
      amount_received: received,
      opening_balance: newOpeningBalance,
      is_current: true,
    })

    setReceiveSaving(false)
    if (error) {
      setToast({ message: 'Could not start new cycle. Try again.', type: 'error' })
      // Rollback: re-set current cycle
      await supabase.from('cycles').update({ is_current: true, ended_at: null }).eq('id', cycle.id)
    } else {
      setReceiveAmount('')
      setShowReceiveModal(false)
      setToast({ message: `New cycle started with Rs ${received + newOpeningBalance}`, type: 'success' })
      loadCycle()
    }
  }

  const currentBudget = cycle ? cycle.opening_balance + cycle.amount_received : 0
  const balance = currentBudget - cycleSpent
  const balancePct = currentBudget > 0 ? Math.min(100, (cycleSpent / currentBudget) * 100) : 0
  const balanceColor = balance < 0 ? '#c0392b' : balance < currentBudget * 0.2 ? '#e67e22' : '#7B9E87'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader title="Book" subtitle="Household expenses" />

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>

        {/* Balance card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Remaining balance</div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em', color: balanceColor }}>
                Rs {balance.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                of Rs {currentBudget.toLocaleString('en-IN')} this cycle
              </div>
            </div>
            <button
              onClick={() => setShowReceiveModal(true)}
              style={{
                padding: '9px 14px', borderRadius: 10,
                border: '1.5px solid var(--accent)', background: 'transparent',
                color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              + Received money
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${balancePct}%`,
              background: balanceColor,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Spent Rs {cycleSpent.toLocaleString('en-IN')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{balancePct.toFixed(0)}% used</span>
          </div>
        </div>

        {/* Add expense form */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span className="label" style={{ flex: 1, marginBottom: 0 }}>Item</span>
              <span className="label" style={{ width: 90, marginBottom: 0, textAlign: 'right', flexShrink: 0 }}>Amount (Rs)</span>
              {items.length > 1 && <span style={{ width: 36, flexShrink: 0 }} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((row, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <AutocorrectInput
                      value={row.name}
                      onChange={(val) => updateItem(index, 'name', val)}
                      placeholder={index === 0 ? 'tomato, aloo...' : 'Item name...'}
                    />
                  </div>
                  <input
                    type="number" className="input-field" value={row.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    placeholder="0" inputMode="decimal"
                    style={{ width: 90, flexShrink: 0, fontSize: 16, fontWeight: 600, textAlign: 'right' }}
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItemRow(index)} style={{
                      width: 36, height: 48, flexShrink: 0, borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--bg-3)',
                      color: 'var(--text-3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItemRow} style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8,
              border: '1px dashed var(--border)', background: 'transparent',
              color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add another item
            </button>
          </div>

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--bg-3)', border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>Total</span>
            <span style={{
              fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
              color: totalAmount > 0 ? 'var(--accent)' : 'var(--text-3)',
            }}>
              Rs {totalAmount > 0 ? totalAmount.toLocaleString('en-IN') : '0'}
            </span>
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" value={date}
              onChange={(e) => setDate(e.target.value)} style={{ fontSize: 15 }} />
          </div>

          <div>
            <label className="label">Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} style={{
                  padding: '9px 18px', borderRadius: 24, cursor: 'pointer',
                  border: `1.5px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                  background: category === cat ? 'var(--accent)' : 'var(--bg-3)',
                  color: category === cat ? 'white' : 'var(--text-2)',
                  fontSize: 14, fontWeight: category === cat ? 600 : 400,
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', textTransform: 'capitalize',
                }}>{cat}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input-field" value={notes}
              onChange={(e) => setNotes(e.target.value)} placeholder="Kirana, mandi, etc." />
          </div>

          <button className="btn-primary" onClick={handleSubmit}
            disabled={saving || !canSubmit}
            style={{ opacity: saving || !canSubmit ? 0.5 : 1, marginTop: 4 }}>
            {saving ? 'Saving...' : 'Add to Book'}
          </button>
        </div>
      </div>

      {/* Receive money modal */}
      {showReceiveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowReceiveModal(false) }}>
          <div style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: 'var(--card)', borderRadius: '20px 20px 0 0',
            padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          }}>
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
              Money received
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 20px', lineHeight: 1.5 }}>
              This will start a new cycle. Any remaining balance from this cycle
              {balance > 0 ? ` (Rs ${balance.toLocaleString('en-IN')})` : ''} will carry forward automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Amount received (Rs)</label>
                <input type="number" className="input-field" value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="0" inputMode="numeric"
                  style={{ fontSize: 22, fontWeight: 700 }}
                  autoFocus />
              </div>
              {receiveAmount && parseFloat(receiveAmount) > 0 && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>New balance will be</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#7B9E87', letterSpacing: '-0.03em' }}>
                    Rs {(parseFloat(receiveAmount) + Math.max(0, balance)).toLocaleString('en-IN')}
                  </div>
                  {balance > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                      Rs {balance.toLocaleString('en-IN')} carried over + Rs {parseFloat(receiveAmount).toLocaleString('en-IN')} received
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => setShowReceiveModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleReceiveMoney}
                  disabled={receiveSaving || !receiveAmount || parseFloat(receiveAmount) <= 0}
                  style={{ flex: 2, opacity: receiveSaving || !receiveAmount ? 0.5 : 1 }}>
                  {receiveSaving ? 'Starting...' : 'Start new cycle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
