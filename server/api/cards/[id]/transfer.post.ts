import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const card = db.prepare('SELECT userId, balance, behavior FROM card WHERE id = ?').get(id) as { userId: string, balance: number, behavior: string } | undefined

  if (!card || card.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Карта не найдена' })
  }

  const body = await readBody<{ amount?: number, direction?: 'to-card' | 'to-wallet' }>(event)

  const amount = Math.floor(Number(body.amount) || 0)
  if (amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Сумма должна быть больше нуля' })
  }
  if (body.direction !== 'to-card' && body.direction !== 'to-wallet') {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестное направление' })
  }

  const user = db.prepare('SELECT balance, creepto FROM user WHERE id = ?').get(session.user.id) as { balance: number, creepto: number }

  let wallet = user.balance
  let cardBalance = card.balance
  let bonus = 0
  let creepto = user.creepto

  if (body.direction === 'to-card') {
    if (wallet < amount) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно МР в кошельке' })
    }
    wallet -= amount
    cardBalance += amount

    if (card.behavior === 'greedy') {
      bonus = Math.floor(amount * 0.067)
      cardBalance += bonus
    }
    if (card.behavior === 'miner') {
      creepto += 1
    }
  } else {
    if (cardBalance < amount) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно МР на карте' })
    }
    cardBalance -= amount
    wallet += amount

    if (card.behavior === 'generous') {
      bonus = 6.7
      wallet += bonus
    }
  }

  db.prepare('UPDATE user SET balance = ?, creepto = ? WHERE id = ?').run(wallet, creepto, session.user.id)
  db.prepare('UPDATE card SET balance = ? WHERE id = ?').run(cardBalance, id)

  return { wallet, cardBalance, bonus, creepto }
})
