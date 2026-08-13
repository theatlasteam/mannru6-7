import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const plugins = db.prepare(
    'SELECT p.id, p.name, p.desc, p.version, p.type, p.code, u.name AS author FROM plugin p JOIN user u ON u.id = p.userId WHERE p.isPublic = 1 AND p.userId != ? ORDER BY p.createdAt DESC'
  ).all(session.user.id)

  return { plugins }
})
