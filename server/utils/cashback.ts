import { db } from '~~/server/utils/auth'

/* Кэшбек с карт: каждая мутация карты даёт +1% возврата с проигрыша
 * в казино (рулетка, плинко). Итог по всем картам, максимум 10%. */
export function cashbackRateFor(userId: string): number {
  const rows = db.prepare('SELECT mutations FROM card WHERE userId = ?').all(userId) as { mutations: number }[]
  const total = rows.reduce((sum, row) => sum + Math.min(Math.max(row.mutations, 0), 5), 0)
  return Math.min(total, 10)
}

/* Возвращает кэшбек с чистого проигрыша (net < 0) и начисляет его на кошелёк. */
export function applyCashback(userId: string, net: number): { rate: number, cashback: number } {
  if (net >= 0) {
    return { rate: 0, cashback: 0 }
  }
  const rate = cashbackRateFor(userId)
  if (rate <= 0) {
    return { rate: 0, cashback: 0 }
  }
  const cashback = Math.max(1, Math.round((Math.abs(net) * rate) / 100))
  db.prepare('UPDATE user SET balance = balance + ? WHERE id = ?').run(cashback, userId)
  return { rate, cashback }
}
