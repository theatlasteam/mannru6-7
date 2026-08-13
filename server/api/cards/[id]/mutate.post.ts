import { auth, db } from '~~/server/utils/auth'
import { CARD_TIERS, isTierUnlocked } from '~~/utils/levels'
import { generateCardNumber } from '~~/utils/cardnumber'

const MUTATE_COST = 300

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const card = db.prepare('SELECT userId, tier, balance, name, mutations, mutationLog, behavior FROM card WHERE id = ?').get(id) as
    | { userId: string, tier: string, balance: number, name: string, mutations: number, mutationLog: string, behavior: string }
    | undefined

  if (!card || card.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Карта не найдена' })
  }

  const cost = card.behavior === 'lucky' ? 0 : MUTATE_COST

  if (card.balance < cost) {
    throw createError({ statusCode: 400, statusMessage: `Мутация стоит ${cost} МР с баланса карты` })
  }

  const body = await readBody<{ name?: string }>(event)
  const name = (body.name ?? '').trim().slice(0, 24) || card.name

  const user = db.prepare('SELECT xp FROM user WHERE id = ?').get(session.user.id) as { xp: number }

  const unlockedTiers = CARD_TIERS.filter(tier => isTierUnlocked(user.xp, tier.key))
  const newTier = unlockedTiers[Math.floor(Math.random() * unlockedTiers.length)]!

  const tierLevel = CARD_TIERS.findIndex(tier => tier.key === newTier.key) + 1
  const number = generateCardNumber(tierLevel)
  const last4 = number.slice(-4)
  const mutations = card.mutations + 1
  const cardBalance = card.balance - cost

  const log = JSON.parse(card.mutationLog || '[]') as { from: string, to: string, at: number }[]
  log.push({ from: card.tier, to: newTier.key, at: Date.now() })

  db.prepare('UPDATE card SET name = ?, tier = ?, number = ?, last4 = ?, color = ?, balance = ?, mutations = ?, mutationLog = ? WHERE id = ?')
    .run(name, newTier.key, number, last4, newTier.color, cardBalance, mutations, JSON.stringify(log), id)

  return {
    card: { id, name, tier: newTier.key, number, last4, color: newTier.color, balance: cardBalance, mutations, mutationLog: log, behavior: card.behavior },
    tier: newTier,
    cost
  }
})
