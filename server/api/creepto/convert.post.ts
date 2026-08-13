import { auth, db } from '~~/server/utils/auth'
import { manncoinRate } from '~~/utils/creepto'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ cardId?: string }>(event)

  if (!body.cardId) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите карту' })
  }

  const card = db.prepare('SELECT userId, balance FROM card WHERE id = ?').get(body.cardId) as { userId: string, balance: number } | undefined

  if (!card || card.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Карта не найдена' })
  }

  const user = db.prepare('SELECT creepto FROM user WHERE id = ?').get(session.user.id) as { creepto: number }

  const rate = manncoinRate()
  const convertedMp = Math.floor(user.creepto / rate)

  if (convertedMp <= 0) {
    throw createError({ statusCode: 400, statusMessage: `Нужно хотя бы ${Math.ceil(rate)} Маннкоин для обмена` })
  }

  const creepto = user.creepto - convertedMp * rate
  const cardBalance = card.balance + convertedMp

  db.prepare('UPDATE user SET creepto = ? WHERE id = ?').run(creepto, session.user.id)
  db.prepare('UPDATE card SET balance = ? WHERE id = ?').run(cardBalance, body.cardId)

  return { creepto, cardBalance, convertedMp, rate }
})
