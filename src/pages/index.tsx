import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import AutocorrectInput from '@/components/AutocorrectInput'
import Toast from '@/components/Toast'

export default function AddExpense() {
  const [item, setItem] = useState('')
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
      .from('app_settings')
      .select('value')
      .eq('key', 'categories')
      .single()
    if (data) {
      setCategories(data.value as string[])
      setCategory((data.value as string[])[0] || 'others')
    }
  }

  const loadTodayTotal = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('expenses')
      .select('amount')
      .eq('date', today)
    if (data) {
      setTodayTotal(data.reduce((sum, e) => sum + Number(e.amount), 0))
    }
  }

  const handleSubmit = async () => {
    if (!item.trim() || !amount || parseFloat(amount) <= 0) {
      setToast({ message: 'Please fill in item and amount', type: 'error' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      item: item.trim(),
      amount: parseFloat(amount),
      category,
      notes: notes.trim() || null,
      date,
    })
    setSaving(false)
    if (error) {
      setToast({ message: 'Could not save. Try again.', type: 'error' })
    } else {
      setToast({ message: `Saved: ${item.trim()} — Rs ${amount}`, type: 'success' })
      setItem('')
      setAmount('')
      setNotes('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      loadTodayTotal()
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <PageHeader title="Book" subtitle="Household expenses" />

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>
        {/* Today's summary strip */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>
              {format(new Date(), 'EEEE, d MMMM')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              Spent today
            </div>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: todayTotal > 0 ? 'var(--accent)' : 'var(--text-3)',
              letterSpacing: '-0.03em',
            }}
          >
            Rs {todayTotal > 0 ? todayTotal.toLocaleString('en-IN') : '0'}
          </div>
        </div>

        {/* Form */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div>
            <label className="label">Item name</label>
            <AutocorrectInput
              value={item}
              onChange={setItem}
              placeholder="e.g. tomato, dhaniya, atta..."
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Amount (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                style={{ fontSize: 18, fontWeight: 600 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Date</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ fontSize: 15 }}
              />
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 24,
                    border: `1.5px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                    background: category === cat ? 'var(--accent)' : 'var(--bg-3)',
                    color: category === cat ? 'white' : 'var(--text-2)',
                    fontSize: 14,
                    fontWeight: category === cat ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input
              type="text"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kirana, mandi, etc."
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !item.trim() || !amount}
            style={{
              opacity: saving || !item.trim() || !amount ? 0.5 : 1,
              marginTop: 4,
            }}
          >
            {saving ? 'Saving...' : 'Add to Book'}
          </button>
        </div>

        {/* Quick tip */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >

        </p>
      </div>

      <BottomNav />
    </div>
  )
}
