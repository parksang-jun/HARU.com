// 여행 가계부 — 지출 기록과 1/N 정산. 기기에 저장한다.
import { loadJson, saveJson } from './storage'

export interface Expense {
  id: string
  title: string
  amount: number
  currency: string
  /** 낸 사람 */
  payer: string
  /** 함께 쓴 사람 (비면 전원) */
  among: string[]
  day?: number
}

export interface Ledger {
  members: string[]
  expenses: Expense[]
}

export const EMPTY_LEDGER: Ledger = { members: [], expenses: [] }
const key = (tripId: string) => `ledger:${tripId}`
export const loadLedger = (tripId: string) => loadJson<Ledger>(key(tripId), EMPTY_LEDGER)
export const saveLedger = (tripId: string, l: Ledger) => saveJson(key(tripId), l)

export function addMember(l: Ledger, name: string): Ledger {
  const n = name.trim().slice(0, 20)
  if (!n || l.members.includes(n) || l.members.length >= 12) return l
  return { ...l, members: [...l.members, n] }
}

/** 지출 기록이 있는 사람은 지우지 않는다 */
export function removeMember(l: Ledger, name: string): Ledger {
  if (l.expenses.some((e) => e.payer === name || e.among.includes(name))) return l
  return { ...l, members: l.members.filter((m) => m !== name) }
}

export function addExpense(l: Ledger, e: Omit<Expense, 'id'>): Ledger {
  const title = e.title.trim().slice(0, 60)
  if (!title || !Number.isFinite(e.amount) || e.amount <= 0 || !l.members.includes(e.payer)) return l
  const among = e.among.filter((m) => l.members.includes(m))
  return { ...l, expenses: [...l.expenses, { ...e, title, among, id: `e${Date.now().toString(36)}${l.expenses.length}` }] }
}

export const removeExpense = (l: Ledger, id: string): Ledger => ({ ...l, expenses: l.expenses.filter((e) => e.id !== id) })

/** 통화별 총 지출 */
export function totals(l: Ledger): { currency: string; total: number }[] {
  const by = new Map<string, number>()
  for (const e of l.expenses) by.set(e.currency, (by.get(e.currency) ?? 0) + e.amount)
  return [...by.entries()].map(([currency, total]) => ({ currency, total }))
}

export interface Transfer {
  from: string
  to: string
  amount: number
  currency: string
}

const ZERO_DECIMAL = new Set(['KRW', 'JPY', 'VND', 'IDR'])
const roundFor = (amount: number, currency: string) => (ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100) / 100)

/** 사람별 잔액(낸 돈 − 쓴 몫). 양수면 받을 돈 */
export function balances(l: Ledger, currency: string): Record<string, number> {
  const bal: Record<string, number> = Object.fromEntries(l.members.map((m) => [m, 0]))
  for (const e of l.expenses) {
    if (e.currency !== currency) continue
    const among = e.among.length ? e.among : l.members
    if (!among.length) continue
    bal[e.payer] = (bal[e.payer] ?? 0) + e.amount
    for (const m of among) bal[m] = (bal[m] ?? 0) - e.amount / among.length
  }
  return bal
}

/** 1/N 정산: 누가 누구에게 얼마를 보내면 되는지 (송금 횟수를 줄이는 방식, 통화별) */
export function settle(l: Ledger): Transfer[] {
  const out: Transfer[] = []
  for (const { currency } of totals(l)) {
    const bal = balances(l, currency)
    const eps = ZERO_DECIMAL.has(currency) ? 0.5 : 0.005
    const debtors = Object.entries(bal).filter(([, v]) => v < -eps).map(([n, v]) => ({ n, v: -v })).sort((a, b) => b.v - a.v)
    const creditors = Object.entries(bal).filter(([, v]) => v > eps).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v)
    let i = 0
    let j = 0
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].v, creditors[j].v)
      const amount = roundFor(pay, currency)
      if (amount > 0) out.push({ from: debtors[i].n, to: creditors[j].n, amount, currency })
      debtors[i].v -= pay
      creditors[j].v -= pay
      if (debtors[i].v <= eps) i++
      if (creditors[j].v <= eps) j++
    }
  }
  return out
}
