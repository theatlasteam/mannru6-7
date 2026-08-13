import { auth, db } from '~~/server/utils/auth'
import { applyCashback } from '~~/server/utils/cashback'

const MULTIPLIERS_8 = [8, 3, 1.5, 0.6, 0.5, 0.6, 1.5, 3, 8]
const MULTIPLIERS_16 = [120, 44, 16, 6, 2.2, 1.2, 0.7, 0.6, 0.5, 0.6, 0.7, 1.2, 2.2, 6, 16, 44, 120]
const MIN_BET = 1
const MAX_BET = 100000

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ amount?: unknown, rows?: unknown }>(event)

  const amount = Math.floor(Number(body.amount))
  const rows = body.rows === 8 ? 8 : body.rows === 16 ? 16 : 16

  if (!Number.isFinite(amount) || amount < MIN_BET) {
    throw createError({ statusCode: 400, statusMessage: `Ставка — минимум ${MIN_BET} МР` })
  }
  if (amount > MAX_BET) {
    throw createError({ statusCode: 400, statusMessage: `Ставка — максимум ${MAX_BET} МР` })
  }

  const userId = session.user.id
  const user = db.prepare('SELECT balance FROM user WHERE id = ?').get(userId) as { balance: number } | undefined

  if (!user || user.balance < amount) {
    throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей на кошельке' })
  }

  /* физика плинко: мяч на каждой линии отскакивает влево/вправо */
  const path: ('l' | 'r')[] = []
  for (let index = 0; index < rows; index++) {
    path.push(Math.random() < 0.5 ? 'l' : 'r')
  }
  const bucket = path.filter(side => side === 'r').length

  const multipliers = rows === 8 ? MULTIPLIERS_8 : MULTIPLIERS_16
  const multiplier = multipliers[bucket]!
  const win = Math.floor(amount * multiplier)
  const profit = win - amount
  let balance = user.balance + profit

  db.prepare('UPDATE user SET balance = ? WHERE id = ?').run(balance, userId)

  const { rate: cashbackRate, cashback } = applyCashback(userId, profit)
  balance += cashback

  return {
    path,
    rows,
    bucket,
    multiplier,
    win,
    profit,
    cashback,
    cashbackRate,
    balance
  }
})
