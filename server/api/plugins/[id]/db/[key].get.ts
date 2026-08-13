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

  const row = db.prepare('SELECT value, updatedAt FROM plugin_data WHERE pluginId = ? AND key = ?').get(id, key) as
    | { value: string, updatedAt: number }
    | undefined

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Ключ не найден' })
  }

  return {
    key,
    value: JSON.parse(row.value),
    updatedAt: row.updatedAt
  }
})
