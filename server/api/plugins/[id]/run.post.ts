import { auth, db } from '~~/server/utils/auth'
import { manncoinRate } from '~~/utils/creepto'
import { mannruUtils } from '~~/shared/plugin-deps/utils'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const plugin = db.prepare('SELECT userId, code, isPublic, type FROM plugin WHERE id = ?').get(id) as
    | { userId: string, code: string, isPublic: number, type: string }
    | undefined

  if (!plugin || (plugin.userId !== session.user.id && !plugin.isPublic)) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  const { manifest, hooks } = runPluginCode(plugin.code)
  const run = hooks.run

  if (typeof run !== 'function') {
    if (plugin.type === 'gui' && plugin.userId === session.user.id) {
      db.prepare('UPDATE plugin SET active = 1 WHERE id = ?').run(id)
      return { output: 'Виджет включён в боковой панели' }
    }
    return { output: 'Плагин запущен. Хук run не определён.' }
  }

  const ctx = {
    xp: session.user.xp ?? 0,
    name: session.user.name,
    rate: manncoinRate(),
    ...(manifest.dependencies.includes('utils') ? { utils: mannruUtils } : {})
  }

  const result = run(ctx)

  return {
    output: typeof result === 'string' ? result : JSON.stringify(result ?? null)
  }
})
