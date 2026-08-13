import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const plugin = db.prepare('SELECT id, userId, name, desc, version, type, code, icon, isPublic FROM plugin WHERE id = ?').get(id) as
    | { id: string, userId: string, name: string, desc: string, version: string, type: string, code: string, icon: string, isPublic: number }
    | undefined

  if (!plugin || !plugin.isPublic) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  if (plugin.userId === session.user.id) {
    throw createError({ statusCode: 400, statusMessage: 'Это ваш плагин — он уже у вас' })
  }

  const existing = db.prepare('SELECT id FROM plugin WHERE userId = ? AND code = ?').get(session.user.id, plugin.code) as { id: string } | undefined

  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'Плагин уже установлен' })
  }

  const newId = crypto.randomUUID()
  const createdAt = Date.now()

  db.prepare('INSERT INTO plugin (id, userId, name, desc, version, type, code, icon, active, isPublic, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)')
    .run(newId, session.user.id, plugin.name, plugin.desc, plugin.version, plugin.type, plugin.code, plugin.icon, createdAt)

  return {
    plugin: {
      id: newId,
      name: plugin.name,
      desc: plugin.desc,
      version: plugin.version,
      type: plugin.type,
      code: plugin.code,
      icon: plugin.icon,
      active: 1,
      isPublic: 0,
      createdAt
    }
  }
})
