import { auth, db } from '~~/server/utils/auth'
import { manncoinRate, manncoinRateChange } from '~~/utils/creepto'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const plugins = db.prepare('SELECT id, name, type, code, icon FROM plugin WHERE userId = ? AND type IN (\'gui\', \'tab\') AND active = 1 ORDER BY createdAt DESC').all(session.user.id)

  const now = Date.now()

  return {
    plugins,
    ctx: {
      rate: manncoinRate(now),
      change: manncoinRateChange(now),
      xp: session.user.xp ?? 0,
      name: session.user.name
    }
  }
})
