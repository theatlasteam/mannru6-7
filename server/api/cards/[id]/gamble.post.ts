import { auth, db } from '~~/server/utils/auth'
import { CARD_TIERS, isTierUnlocked, getCardTier } from '~~/utils/levels'
import { generateCardNumber } from '~~/utils/cardnumber'
import { rollBehavior, getCardBehavior } from '~~/utils/behaviors'

const GAMBLE_COST = 300

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const card = db.prepare('SELECT id, userId, name, tier, number, last4, color, balance, mutations, mutationLog, behavior, createdAt FROM card WHERE id = ?').get(id) as
    | { id: string, userId: string, name: string, tier: string, number: string, last4: string, color: string, balance: number, mutations: number, mutationLog: string, behavior: string, createdAt: number }
    | undefined

  if (!card || card.userId !== session.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Карта не найдена' })
  }

  const cost = card.behavior === 'lucky' ? 0 : GAMBLE_COST

  if (card.balance < cost) {
    throw createError({ statusCode: 400, statusMessage: `Гадание стоит ${cost} МР с баланса карты. На карте ${card.balance} МР.` })
  }

  const user = db.prepare('SELECT xp FROM user WHERE id = ?').get(session.user.id) as { xp: number }

  const unlockedTiers = CARD_TIERS.filter(tier => isTierUnlocked(user.xp, tier.key))
  const currentLevel = CARD_TIERS.findIndex(tier => tier.key === card.tier)
  const higherTiers = unlockedTiers.filter(tier => CARD_TIERS.findIndex(item => item.key === tier.key) > currentLevel)

  const roll = Math.random()
  let result: 'upgrade' | 'mutation' | 'loss'
  if (higherTiers.length > 0) {
    result = roll < 0.35 ? 'loss' : roll < 0.65 ? 'mutation' : 'upgrade'
  } else {
    result = roll < 0.4 ? 'loss' : 'mutation'
  }

  const now = Date.now()
  const log = JSON.parse(card.mutationLog || '[]') as { from: string, to: string, at: number }[]

  if (result === 'loss') {
    db.prepare('DELETE FROM card WHERE id = ?').run(id)
    return {
      result,
      card: null,
      tier: null,
      behavior: null,
      mutated: false,
      cost,
      message: 'Карта сгорела в рулетке. Осталась только память.'
    }
  }

  const newTierKey = result === 'upgrade'
    ? higherTiers[Math.floor(Math.random() * higherTiers.length)]!.key
    : card.tier
  const tier = getCardTier(newTierKey)
  const behavior = rollBehavior()
  const tierLevel = CARD_TIERS.findIndex(item => item.key === newTierKey) + 1
  const number = generateCardNumber(tierLevel)
  const last4 = number.slice(-4)
  const mutations = card.mutations + 1
  const cardBalance = card.balance - cost

  log.push({ from: card.tier, to: newTierKey, at: now })

  db.prepare('UPDATE card SET tier = ?, number = ?, last4 = ?, color = ?, balance = ?, mutations = ?, mutationLog = ?, behavior = ? WHERE id = ?')
    .run(newTierKey, number, last4, tier.color, cardBalance, mutations, JSON.stringify(log), behavior, id)

  return {
    result,
    card: {
      id: card.id,
      name: card.name,
      tier: newTierKey,
      number,
      last4,
      color: tier.color,
      balance: cardBalance,
      mutations,
      mutationLog: log,
      behavior,
      createdAt: card.createdAt
    },
    tier,
    behavior: getCardBehavior(behavior),
    mutated: true,
    cost,
    message: result === 'upgrade'
      ? `Карта поднялась до тира «${tier.name}» и мутировала! Поведение: «${getCardBehavior(behavior).name}».`
      : `Карта мутировала! Поведение: «${getCardBehavior(behavior).name}».`
  }
})
