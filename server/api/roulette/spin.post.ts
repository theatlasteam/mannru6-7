import { auth, db } from '~~/server/utils/auth'
import { applyCashback } from '~~/server/utils/cashback'

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const BET_TYPES = ['number', 'color', 'parity', 'range', 'dozen', 'column'] as const
const PAYOUTS: Record<string, number> = {
  number: 35,
  color: 1,
  parity: 1,
  range: 1,
  dozen: 2,
  column: 2
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ bets?: unknown }>(event)

  const rawBets = Array.isArray(body.bets) ? body.bets : []
  if (rawBets.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Сделайте хотя бы одну ставку' })
  }
  if (rawBets.length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Слишком много ставок' })
  }

  type Bet = { type: string, value: unknown, amount: number }
  const bets: Bet[] = []
  let totalStake = 0

  for (const raw of rawBets) {
    const bet = raw as Bet
    if (!bet || typeof bet !== 'object' || !BET_TYPES.includes(bet.type as never)) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная ставка' })
    }
    const amount = Math.floor(Number(bet.amount))
    if (!Number.isFinite(amount) || amount < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Ставка — минимум 1 МР' })
    }
    const value = bet.value
    const valid = bet.type === 'number'
      ? Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 36
      : bet.type === 'color'
        ? value === 'red' || value === 'black'
        : bet.type === 'parity'
          ? value === 'even' || value === 'odd'
          : bet.type === 'range'
            ? value === 'low' || value === 'high'
            : bet.type === 'dozen'
              ? Number(value) === 1 || Number(value) === 2 || Number(value) === 3
              : Number(value) === 1 || Number(value) === 2 || Number(value) === 3
    if (!valid) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректное значение ставки' })
    }
    bets.push({ type: bet.type, value, amount })
    totalStake += amount
  }

  const userId = session.user.id
  const user = db.prepare('SELECT balance FROM user WHERE id = ?').get(userId) as { balance: number } | undefined

  if (!user || user.balance < totalStake) {
    throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей на кошельке' })
  }

  const number = Math.floor(Math.random() * 37)
  const color = number === 0 ? 'green' : RED_NUMBERS.has(number) ? 'red' : 'black'

  const results = bets.map((bet) => {
    let win = false
    if (bet.type === 'number') {
      win = Number(bet.value) === number
    } else if (bet.type === 'color') {
      win = color !== 'green' && bet.value === color
    } else if (bet.type === 'parity') {
      win = number !== 0 && (bet.value === 'even' ? number % 2 === 0 : number % 2 === 1)
    } else if (bet.type === 'range') {
      win = bet.value === 'low' ? number >= 1 && number <= 18 : number >= 19 && number <= 36
    } else if (bet.type === 'dozen') {
      const dozen = Number(bet.value)
      win = number >= (dozen - 1) * 12 + 1 && number <= dozen * 12
    } else {
      const column = Number(bet.value)
      win = number !== 0 && number % 3 === column % 3
    }
    const multiplier = PAYOUTS[bet.type] ?? 0
    const returnAmount = win ? bet.amount * (multiplier + 1) : 0
    return {
      type: bet.type,
      value: bet.value,
      amount: bet.amount,
      win,
      multiplier,
      returnAmount,
      net: returnAmount - bet.amount
    }
  })

  const totalReturn = results.reduce((sum, result) => sum + result.returnAmount, 0)
  const net = totalReturn - totalStake
  let balance = user.balance + net

  db.prepare('UPDATE user SET balance = ? WHERE id = ?').run(balance, userId)

  const { rate: cashbackRate, cashback } = applyCashback(userId, net)
  balance += cashback

  return {
    number,
    color,
    results,
    totalStake,
    totalReturn,
    net,
    cashback,
    cashbackRate,
    balance
  }
})
