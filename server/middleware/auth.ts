import { auth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)

  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/plugin') && !pathname.startsWith('/cards') && !pathname.startsWith('/creepto') && !pathname.startsWith('/plugins')) {
    return
  }

  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    const redirect = encodeURIComponent(pathname)
    return sendRedirect(event, `/login?redirect=${redirect}`)
  }
})
