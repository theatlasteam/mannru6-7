import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ code?: string, isPublic?: boolean }>(event)

  const code = (body.code ?? '').trim()
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Код плагина пуст' })
  }

  const { manifest, hooks, component } = runPluginCode(code)

  if (Object.keys(hooks).length === 0 && !component) {
    throw createError({ statusCode: 400, statusMessage: 'Плагин должен определять хуки или Vue-компонент' })
  }

  const isPublic = body.isPublic ? 1 : 0
  const id = crypto.randomUUID()
  const createdAt = Date.now()

  db.prepare('INSERT INTO plugin (id, userId, name, desc, version, type, code, icon, active, isPublic, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)')
    .run(id, session.user.id, manifest.name, manifest.desc, manifest.version, manifest.type, code, manifest.icon, isPublic, createdAt)

  return {
    plugin: { id, name: manifest.name, desc: manifest.desc, version: manifest.version, type: manifest.type, code, active: 1, isPublic, createdAt },
    hooks: Object.keys(hooks)
  }
})
