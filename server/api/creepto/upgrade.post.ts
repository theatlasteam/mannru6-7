import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const user = db.prepare('SELECT creepto, clickPower FROM user WHERE id = ?').get(session.user.id) as { creepto: number, clickPower: number }

  const cost = user.clickPower * 100

  if (user.creepto < cost) {
    throw createError({ statusCode: 400, statusMessage: `Апгрейд стоит ${cost} Маннкоин` })
  }

  const creepto = user.creepto - cost
  const clickPower = user.clickPower + 1

  db.prepare('UPDATE user SET creepto = ?, clickPower = ? WHERE id = ?').run(creepto, clickPower, session.user.id)

  return { creepto, clickPower, cost }
})
