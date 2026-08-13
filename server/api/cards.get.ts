import { auth, db } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const rows = db.prepare('SELECT id, name, tier, number, last4, color, balance, mutations, mutationLog, behavior, createdAt FROM card WHERE userId = ? ORDER BY createdAt ASC').all(session.user.id) as {
    id: string
    name: string
    tier: string
    number: string
    last4: string
    color: string
    balance: number
    mutations: number
    mutationLog: string
    behavior: string
    createdAt: number
  }[]

  const cards = rows.map(row => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    number: row.number,
    last4: row.last4,
    color: row.color,
    balance: row.balance,
    mutations: row.mutations,
    mutationLog: JSON.parse(row.mutationLog || '[]'),
    behavior: row.behavior,
    createdAt: row.createdAt
  }))

  return { cards }
})
