import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const card = db.prepare('SELECT userId FROM card WHERE id = ?').get(id) as { userId: string } | undefined

  if (!card || card.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Карта не найдена' })
  }

  db.prepare('DELETE FROM card WHERE id = ?').run(id)

  return { ok: true }
})
