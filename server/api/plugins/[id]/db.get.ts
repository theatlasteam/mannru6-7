import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const plugin = db.prepare('SELECT userId FROM plugin WHERE id = ?').get(id) as { userId: string } | undefined

  if (!plugin || plugin.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  const rows = db.prepare('SELECT key, value, updatedAt FROM plugin_data WHERE pluginId = ? ORDER BY key').all(id) as { key: string, value: string, updatedAt: number }[]

  return {
    entries: rows.map(row => ({
      key: row.key,
      value: JSON.parse(row.value),
      updatedAt: row.updatedAt
    }))
  }
})
