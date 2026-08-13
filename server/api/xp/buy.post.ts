import { auth, db } from '~~/server/utils/auth'

const MP_PER_XP = 10

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ amount?: number }>(event)

  const amount = Math.floor(Number(body.amount) || 0)

  if (amount < MP_PER_XP) {
    throw createError({ statusCode: 400, statusMessage: `Минимум ${MP_PER_XP} МР за обмен` })
  }

  const user = db.prepare('SELECT balance, xp FROM user WHERE id = ?').get(session.user.id) as { balance: number, xp: number }

  if (user.balance < amount) {
    throw createError({ statusCode: 400, statusMessage: 'Недостаточно МР в кошельке' })
  }

  const gainedXp = amount / MP_PER_XP
  const balance = user.balance - amount
  const xp = user.xp + gainedXp

  db.prepare('UPDATE user SET balance = ?, xp = ? WHERE id = ?').run(balance, xp, session.user.id)

  return { balance, xp, gainedXp, rate: MP_PER_XP }
})
