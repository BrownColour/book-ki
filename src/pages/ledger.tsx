import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase, LedgerTransaction } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import Toast from '@/components/Toast'

type Person = 'H' | 'S' | 'L'

const PERSON_COLORS: Record<Person, string> = {
  H: '#7B9E87',
  S: '#8B7BA8',
  L: '#C4923A',
}

interface Totals {
  given: number
  returned: number
  outstanding: number
}

export default function Ledger() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])
  const [activePerson, setActivePerson] = useState<Person>('H')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addDate, setAddDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [addType, setAddType] = useState<'given' | 'returned'>('given')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTransactions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ledger_transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const getTotals = (person: Person): Totals => {
    const personTx = transactions.filter((t) => t.person === person)
    const given = personTx
      .filter((t) => t.type === 'given')
      .reduce((s, t) => s + Number(t.amount), 0)
    const returned = personTx
      .filter((t) => t.type === 'returned')
      .reduce((s, t) => s + Number(t.amount), 0)
    return { given, returned, outstanding: given - returned }
  }

  const handleAdd = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      setToast({ message: 'Enter a valid amount', type: 'error' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('ledger_transactions').insert({
      person: activePerson,
      amount: parseFloat(addAmount),
      note: addNote.trim() || null,
      date: addDate,
      type: addType,
    })
    setSaving(false)
    if (error) {
      setToast({ message: 'Could not save. Try again.', type: 'error' })
    } else {
      const label = addType === 'given' ? 'given to' : 'returned by'
      setToast({ message: `Rs ${addAmount} ${label} ${activePerson}`, type: 'success' })
      setAddAmount('')
      setAddNote('')
      setAddDate(format(new Date(), 'yyyy-MM-dd'))
      setShowAddModal(false)
      loadTransactions()
    }
  }

  const personTx = transactions.filter((t) => t.person === activePerson)
  const totals = getTotals(activePerson)
  const color = PERSON_COLORS[activePerson]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <PageHeader title="Ledger" subtitle="Cash given to H, S, L" />

      <div className="page-content with-nav" style={{ paddingTop: 20 }}>
        {/* Person tabs */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {(['H', 'S', 'L'] as Person[]).map((p) => {
            const t = getTotals(p)
            const active = activePerson === p
            return (
              <button
                key={p}
                onClick={() => setActivePerson(p)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  borderRadius: 14,
                  border: `2px solid ${active ? PERSON_COLORS[p] : 'var(--border)'}`,
                  background: active ? `${PERSON_COLORS[p]}18` : 'var(--card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: active ? PERSON_COLORS[p] : 'var(--text-2)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {p}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: t.outstanding > 0 ? PERSON_COLORS[p] : 'var(--text-3)',
                    fontWeight: 500,
                  }}
                >
                  Rs {t.outstanding.toLocaleString('en-IN')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Summary card for active person */}
        <div
          style={{
            background: 'var(--card)',
            border: `1px solid ${color}40`,
            borderRadius: 16,
            padding: '18px 20px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-3)',
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            Account — {activePerson}
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{ flex: 1, borderRight: '1px solid var(--border)', paddingRight: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Total given</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Rs {totals.given.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ flex: 1, paddingLeft: 16, borderRight: '1px solid var(--border)', paddingRight: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Returned</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Rs {totals.returned.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ flex: 1, paddingLeft: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Outstanding</div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: totals.outstanding > 0 ? color : 'var(--text-3)',
                  letterSpacing: '-0.02em',
                }}
              >
                Rs {totals.outstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Add transaction button */}
        <button
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ marginBottom: 20, background: color }}
        >
          Add Transaction for {activePerson}
        </button>

        {/* Transactions list */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
          History
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 40 }}>Loading...</div>
        ) : personTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 15 }}>No transactions yet for {activePerson}</div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {personTx.map((tx, idx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '13px 16px',
                  borderBottom: idx < personTx.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 10,
                        background: tx.type === 'given' ? `${color}25` : '#7B9E8725',
                        color: tx.type === 'given' ? color : '#7B9E87',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {tx.type}
                    </span>
                    {tx.note && (
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{tx.note}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {format(new Date(tx.date + 'T00:00:00'), 'd MMM yyyy')}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: tx.type === 'given' ? color : '#7B9E87',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tx.type === 'returned' ? '+' : ''}Rs {Number(tx.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
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
            if (e.target === e.currentTarget) setShowAddModal(false)
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
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 20px',
                color: color,
              }}
            >
              Transaction for {activePerson}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type toggle */}
              <div>
                <label className="label">Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['given', 'returned'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAddType(t)}
                      style={{
                        flex: 1,
                        padding: '11px 0',
                        borderRadius: 10,
                        border: `1.5px solid ${addType === t ? color : 'var(--border)'}`,
                        background: addType === t ? `${color}20` : 'var(--bg-3)',
                        color: addType === t ? color : 'var(--text-2)',
                        fontSize: 14,
                        fontWeight: addType === t ? 600 : 400,
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Amount (Rs)</label>
                <input
                  type="number"
                  className="input-field"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  style={{ fontSize: 20, fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Note (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Daily sabzi, market, etc."
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAdd}
                  disabled={saving || !addAmount}
                  style={{ flex: 2, background: color, opacity: saving || !addAmount ? 0.5 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save'}
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
