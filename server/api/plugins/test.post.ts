import { auth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ code?: string }>(event)

  const code = (body.code ?? '').trim()
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Код плагина пуст' })
  }

  const { manifest, hooks } = runPluginCode(code)

  return { manifest, hooks: Object.keys(hooks) }
})
