import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const plugin = db.prepare('SELECT userId, active FROM plugin WHERE id = ?').get(id) as { userId: string, active: number } | undefined

  if (!plugin || plugin.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  const active = plugin.active ? 0 : 1

  db.prepare('UPDATE plugin SET active = ? WHERE id = ?').run(active, id)

  return { active }
})
