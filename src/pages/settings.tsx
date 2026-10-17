import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import Toast from '@/components/Toast'
import { useTheme } from '@/hooks/useTheme'

export default function Settings() {
  const [categories, setCategories] = useState<string[]>(['fruits', 'vegetables', 'others'])
  const [newCat, setNewCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { isDark, toggle } = useTheme()

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

  const saveCategories = async (updated: string[]) => {
    setSaving(true)
    const { error } = await supabase
      .from('app_settings')
      .update({ value: updated })
      .eq('key', 'categories')
    setSaving(false)
    if (error) {
      setToast({ message: 'Could not save. Try again.', type: 'error' })
    } else {
      setToast({ message: 'Categories saved', type: 'success' })
    }
  }

  const handleAdd = () => {
    const trimmed = newCat.trim().toLowerCase()
    if (!trimmed) return
    if (categories.includes(trimmed)) {
      setToast({ message: 'Category already exists', type: 'error' })
      return
    }
    const updated = [...categories, trimmed]
    setCategories(updated)
    setNewCat('')
    saveCategories(updated)
  }

  const handleRemove = (cat: string) => {
    const defaults = ['fruits', 'vegetables', 'others']
    if (defaults.includes(cat)) {
      setToast({ message: `"${cat}" is a default category`, type: 'error' })
      return
    }
    const updated = categories.filter((c) => c !== cat)
    setCategories(updated)
    saveCategories(updated)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <PageHeader title="Settings" />

      <div className="page-content with-nav" style={{ paddingTop: 24 }}>

        {/* Theme */}
        <div
          className="card"
          style={{ padding: '16px 20px', marginBottom: 24 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                Dark mode
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {isDark ? 'Currently on' : 'Currently off'}
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={toggle}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                background: isDark ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: 3,
                  left: isDark ? 25 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-2)',
              marginBottom: 12,
              letterSpacing: '0.02em',
            }}
          >
            Expense categories
          </div>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
            {categories.map((cat, idx) => {
              const isDefault = ['fruits', 'vegetables', 'others'].includes(cat)
              return (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '13px 16px',
                    borderBottom: idx < categories.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        opacity: isDefault ? 0.5 : 1,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 15,
                        color: 'var(--text)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {cat}
                    </span>
                    {isDefault && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-3)',
                          background: 'var(--bg-3)',
                          padding: '2px 7px',
                          borderRadius: 8,
                        }}
                      >
                        default
                      </span>
                    )}
                  </div>
                  {!isDefault && (
                    <button
                      onClick={() => handleRemove(cat)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: '#c0392b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add new category */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <label className="label">Add new category</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input-field"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="e.g. medicine, stationery"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleAdd}
                disabled={!newCat.trim() || saving}
                style={{
                  padding: '14px 18px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !newCat.trim() ? 'default' : 'pointer',
                  opacity: !newCat.trim() ? 0.4 : 1,
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div
          style={{
            marginTop: 32,
            padding: '16px 20px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            Book
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            A simple household expense tracker. Records expenses, tracks cash given to helpers, and keeps a monthly ledger — all in one place.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
            Version 1.0
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
