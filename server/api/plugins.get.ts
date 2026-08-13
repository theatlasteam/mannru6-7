import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const plugins = db.prepare('SELECT id, name, desc, version, type, code, active, isPublic, createdAt FROM plugin WHERE userId = ? ORDER BY createdAt DESC').all(session.user.id)

  return { plugins }
})
