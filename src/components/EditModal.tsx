import { useState, useEffect } from 'react'
import { Expense } from '@/lib/supabase'
import AutocorrectInput from './AutocorrectInput'

interface EditModalProps {
  expense: Expense | null
  categories: string[]
  onClose: () => void
  onSave: (id: string, data: Partial<Expense>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type Step = 'confirm' | 'edit'

export default function EditModal({ expense, categories, onClose, onSave, onDelete }: EditModalProps) {
  const [step, setStep] = useState<Step>('confirm')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (expense) {
      setItem(expense.item)
      setAmount(expense.amount.toString())
      setCategory(expense.category)
      setNotes(expense.notes || '')
      setDate(expense.date)
      setStep('confirm')
      setShowDeleteConfirm(false)
    }
  }, [expense])

  if (!expense) return null

  const handleSave = async () => {
    if (!item.trim() || !amount) return
    setSaving(true)
    await onSave(expense.id, {
      item: item.trim(),
      amount: parseFloat(amount),
      category,
      notes: notes.trim(),
      date,
    })
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    setSaving(true)
    await onDelete(expense.id)
    setSaving(false)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          background: 'var(--card)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: 36,
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            margin: '0 auto 20px',
          }}
        />

        {step === 'confirm' ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>
              Edit this record?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
              You are about to edit <strong style={{ color: 'var(--text)' }}>{expense.item}</strong> — Rs {expense.amount}. Records should only be changed when there is a real mistake. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                No, go back
              </button>
              <button
                className="btn-primary"
                onClick={() => setStep('edit')}
                style={{ flex: 1, background: 'var(--accent)' }}
              >
                Yes, edit
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text)' }}>
              Edit Record
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Item</label>
                <AutocorrectInput value={item} onChange={setItem} />
              </div>
              <div>
                <label className="label">Amount (Rs)</label>
                <input
                  type="number"
                  className="input-field"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any extra notes"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !item.trim() || !amount}
                style={{ flex: 2, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #c0392b',
                  borderRadius: 10,
                  background: 'transparent',
                  color: '#c0392b',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Delete record
              </button>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #c0392b',
                  background: '#c0392b18',
                }}
              >
                <p style={{ fontSize: 13, color: '#c0392b', margin: '0 0 10px', fontWeight: 500 }}>
                  This will permanently delete this record. Cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--bg-3)',
                      color: 'var(--text)',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      borderRadius: 8,
                      background: '#c0392b',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Deleting...' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
