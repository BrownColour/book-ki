import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import AutocorrectInput from '@/components/AutocorrectInput'
import Toast from '@/components/Toast'

export default function AddExpense() {
  const [items, setItems] = useState<string[]>([''])
  const [amount, setAmount] = useState('')
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

  const updateItem = (index: number, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? value : it)))
  }

  const addItemField = () => {
    setItems((prev) => [...prev, ''])
  }

  const removeItemField = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const filledItems = items.map((it) => it.trim()).filter(Boolean)
    if (filledItems.length === 0 || !amount || parseFloat(amount) <= 0) {
      setToast({ message: 'Please fill in item and amount', type: 'error' })
      return
    }
    setSaving(true)
    const combinedItem = filledItems.join(', ')
    const { error } = await supabase.from('expenses').insert({
      item: combinedItem,
      amount: parseFloat(amount),
      category,
      notes: notes.trim() || null,
      date,
    })
    setSaving(false)
    if (error) {
      setToast({ message: 'Could not save. Try again.', type: 'error' })
    } else {
      setToast({ message: `Saved: ${combinedItem} — Rs ${amount}`, type: 'success' })
      setItems([''])
      setAmount('')
      setNotes('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      loadTodayTotal()
    }
  }

  const hasValidItem = items.some((it) => it.trim().length > 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <PageHeader title="Book" subtitle="Household expenses" />

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>
        {/* Today's summary strip */}
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
          {/* Item fields */}
          <div>
            <label className="label">Items</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <AutocorrectInput
                      value={item}
                      onChange={(val) => updateItem(index, val)}
                      placeholder={index === 0 ? 'e.g. tomato, aloo...' : 'Another item...'}
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemField(index)}
                      style={{
                        width: 36, height: 48, borderRadius: 10, flexShrink: 0,
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

            {/* Add another item button */}
            <button
              type="button"
              onClick={addItemField}
              style={{
                marginTop: 8,
                display: 'flex', alignItems: 'center', gap: 6,
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

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Amount (Rs)</label>
              <input
                type="number" className="input-field" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0" inputMode="numeric"
                style={{ fontSize: 18, fontWeight: 600 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Date</label>
              <input
                type="date" className="input-field" value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ fontSize: 15 }}
              />
            </div>
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
                }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

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
            disabled={saving || !hasValidItem || !amount}
            style={{ opacity: saving || !hasValidItem || !amount ? 0.5 : 1, marginTop: 4 }}
          >
            {saving ? 'Saving...' : 'Add to Book'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
