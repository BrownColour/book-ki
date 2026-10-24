import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import AutocorrectInput from '@/components/AutocorrectInput'
import Toast from '@/components/Toast'

interface ItemRow {
  name: string
  amount: string
}

export default function AddExpense() {
  const [items, setItems] = useState<ItemRow[]>([{ name: '', amount: '' }])
  const [category, setCategory] = useState('vegetables')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categories, setCategories] = useState(['fruits', 'vegetables', 'others'])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [todayTotal, setTodayTotal] = useState<number>(0)

  useEffect(() => {
    loadCategories()
    loadTodayTotal()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('app_settings').select('value').eq('key', 'categories').single()
    if (data) {
      setCategories(data.value as string[])
      setCategory((data.value as string[])[0] || 'others')
    }
  }

  const loadTodayTotal = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase.from('expenses').select('amount').eq('date', today)
    if (data) setTodayTotal(data.reduce((sum, e) => sum + Number(e.amount), 0))
  }

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const addItemRow = () => setItems((prev) => [...prev, { name: '', amount: '' }])

  const removeItemRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  // Auto-sum of all item amounts
  const totalAmount = items.reduce((sum, row) => {
    const val = parseFloat(row.amount)
    return sum + (isNaN(val) ? 0 : val)
  }, 0)

  const hasValidItem = items.some((row) => row.name.trim().length > 0)
  const canSubmit = hasValidItem && totalAmount > 0

  const handleSubmit = async () => {
    if (!canSubmit) {
      setToast({ message: 'Please fill in items and amounts', type: 'error' })
      return
    }
    setSaving(true)
    const filledItems = items
      .filter((row) => row.name.trim())
      .map((row) => row.name.trim())
    const combinedItem = filledItems.join(', ')

    const { error } = await supabase.from('expenses').insert({
      item: combinedItem,
      amount: totalAmount,
      category,
      notes: notes.trim() || null,
      date,
    })
    setSaving(false)
    if (error) {
      setToast({ message: 'Could not save. Try again.', type: 'error' })
    } else {
      setToast({ message: `Saved: ${combinedItem} — Rs ${totalAmount}`, type: 'success' })
      setItems([{ name: '', amount: '' }])
      setNotes('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      loadTodayTotal()
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <PageHeader title="Book" subtitle="Household expenses" />

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>
        {/* Today strip */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>
              {format(new Date(), 'EEEE, d MMMM')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Spent today</div>
          </div>
          <div style={{
            fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em',
            color: todayTotal > 0 ? 'var(--accent)' : 'var(--text-3)',
          }}>
            Rs {todayTotal > 0 ? todayTotal.toLocaleString('en-IN') : '0'}
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

          {/* Column headers */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span className="label" style={{ flex: 1, marginBottom: 0 }}>Item</span>
              <span className="label" style={{ width: 90, marginBottom: 0, textAlign: 'right', flexShrink: 0 }}>Amount (Rs)</span>
              {/* spacer for remove button column */}
              {items.length > 1 && <span style={{ width: 36, flexShrink: 0 }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((row, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Item name */}
                  <div style={{ flex: 1 }}>
                    <AutocorrectInput
                      value={row.name}
                      onChange={(val) => updateItem(index, 'name', val)}
                      placeholder={index === 0 ? 'tomato, aloo...' : 'Item name...'}
                    />
                  </div>

                  {/* Per-item amount */}
                  <input
                    type="number"
                    className="input-field"
                    value={row.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    style={{ width: 90, flexShrink: 0, fontSize: 16, fontWeight: 600, textAlign: 'right' }}
                  />

                  {/* Remove row */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      style={{
                        width: 36, height: 48, flexShrink: 0, borderRadius: 10,
                        border: '1px solid var(--border)', background: 'var(--bg-3)',
                        color: 'var(--text-3)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add row button */}
            <button
              type="button"
              onClick={addItemRow}
              style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8,
                border: '1px dashed var(--border)', background: 'transparent',
                color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add another item
            </button>
          </div>

          {/* Total — read only */}
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

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input
              type="date" className="input-field" value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ fontSize: 15 }}
            />
          </div>

          {/* Category */}
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
                }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <input
              type="text" className="input-field" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kirana, mandi, etc."
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            style={{ opacity: saving || !canSubmit ? 0.5 : 1, marginTop: 4 }}
          >
            {saving ? 'Saving...' : 'Add to Book'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
