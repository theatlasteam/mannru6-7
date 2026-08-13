import { db } from '~~/server/utils/auth'

/* Атомарные операции с балансом: списание проверяет достаточность средств
 * в одном UPDATE — гонок и отрицательных балансов быть не может. */

export function balanceOf(userId: string): number {
  const row = db.prepare('SELECT balance FROM user WHERE id = ?').get(userId) as { balance: number } | undefined
  return row?.balance ?? 0
}

export function debitBalance(userId: string, amount: number): boolean {
  const info = db.prepare('UPDATE user SET balance = balance - ? WHERE id = ? AND balance >= ?').run(amount, userId, amount)
  return info.changes === 1
}

export function creditBalance(userId: string, amount: number): void {
  db.prepare('UPDATE user SET balance = balance + ? WHERE id = ?').run(amount, userId)
}

export type LedgerEntry = {
  kind: string
  pluginId?: string | null
  fromUserId?: string | null
  toUserId?: string | null
  amount: number
  fee?: number
  reference?: string
  status?: string
}

export function addLedger(entry: LedgerEntry): string {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO money_ledger (id, kind, pluginId, fromUserId, toUserId, amount, fee, reference, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    entry.kind,
    entry.pluginId ?? null,
    entry.fromUserId ?? null,
    entry.toUserId ?? null,
    entry.amount,
    entry.fee ?? 0,
    entry.reference ?? '',
    entry.status ?? 'done',
    Date.now()
  )
  return id
}

export function userExists(userId: string): boolean {
  return !!db.prepare('SELECT id FROM user WHERE id = ?').get(userId)
}

export function ledgerById(id: string): { kind: string, pluginId: string | null, fromUserId: string | null, toUserId: string | null, amount: number, reference: string, status: string } | undefined {
  return db.prepare('SELECT kind, pluginId, fromUserId, toUserId, amount, reference, status FROM money_ledger WHERE id = ?').get(id) as
    | { kind: string, pluginId: string | null, fromUserId: string | null, toUserId: string | null, amount: number, reference: string, status: string }
    | undefined
}

export function settleExistsFor(betId: string): boolean {
  return !!db.prepare('SELECT id FROM money_ledger WHERE reference = ? AND kind = ?').get(betId, 'settle')
}

export function closeLedger(id: string): void {
  db.prepare('UPDATE money_ledger SET status = ? WHERE id = ?').run('closed', id)
}
