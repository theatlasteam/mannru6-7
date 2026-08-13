import { auth, db } from '~~/server/utils/auth'

const CHECKIN_XP = 6.7

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = session.user.id

  const user = db.prepare('SELECT xp, lastCheckin FROM user WHERE id = ?').get(userId) as { xp: number, lastCheckin: number | null }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayStart = today.getTime()

  if (user.lastCheckin && user.lastCheckin >= dayStart) {
    throw createError({ statusCode: 400, statusMessage: 'Вы уже отмечались сегодня' })
  }

  const xp = user.xp + CHECKIN_XP

  db.prepare('UPDATE user SET xp = ?, lastCheckin = ? WHERE id = ?').run(xp, Date.now(), userId)

  return { xp, gained: CHECKIN_XP }
})
