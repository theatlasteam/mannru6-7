import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const key = getRouterParam(event, 'key')

  const plugin = db.prepare('SELECT userId FROM plugin WHERE id = ?').get(id) as { userId: string } | undefined

  if (!plugin || plugin.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  db.prepare('DELETE FROM plugin_data WHERE pluginId = ? AND key = ?').run(id, key)

  return { ok: true }
})
