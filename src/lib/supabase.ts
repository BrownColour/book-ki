import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Expense = {
  id: string
  created_at: string
  date: string
  item: string
  amount: number
  category: string
  notes?: string
  updated_at: string
}

export type LedgerAccount = {
  id: string
  person: 'H' | 'S' | 'L'
  total_given: number
  created_at: string
  updated_at: string
}

export type LedgerTransaction = {
  id: string
  created_at: string
  date: string
  person: 'H' | 'S' | 'L'
  amount: number
  note?: string
  type: 'given' | 'returned'
  updated_at: string
}

export type Cycle = {
  id: string
  started_at: string
  ended_at?: string
  amount_received: number
  opening_balance: number
  is_current: boolean
}
