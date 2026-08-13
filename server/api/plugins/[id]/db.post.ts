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

  const body = await readBody<{ key?: string, value?: unknown }>(event)

  const key = (body.key ?? '').trim()
  if (!key || key.length > 64) {
    throw createError({ statusCode: 400, statusMessage: 'Ключ должен быть строкой до 64 символов' })
  }

  let serialized: string
  try {
    serialized = JSON.stringify(body.value ?? null)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Значение не сериализуется в JSON' })
  }
  if (serialized.length > 10000) {
    throw createError({ statusCode: 400, statusMessage: 'Значение слишком большое (макс. 10000 символов JSON)' })
  }

  const dataId = crypto.randomUUID()
  const updatedAt = Date.now()

  db.prepare(
    'INSERT INTO plugin_data (id, pluginId, userId, key, value, updatedAt) VALUES (?, ?, ?, ?, ?, ?) '
    + 'ON CONFLICT(pluginId, key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt'
  ).run(dataId, id, session.user.id, key, serialized, updatedAt)

  return { key, value: body.value ?? null, updatedAt }
})
