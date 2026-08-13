import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const user = db.prepare('SELECT creepto, clickPower FROM user WHERE id = ?').get(session.user.id) as { creepto: number, clickPower: number }

  const creepto = user.creepto + user.clickPower

  db.prepare('UPDATE user SET creepto = ? WHERE id = ?').run(creepto, session.user.id)

  return { creepto, gained: user.clickPower }
})
