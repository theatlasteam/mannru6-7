import { auth, db } from '~~/server/utils/auth'
import { getLevelInfo, getCardTier, isTierUnlocked, CARD_TIERS } from '~~/utils/levels'
import { generateCardNumber } from '~~/utils/cardnumber'
import { getCardBehavior, rollBehavior } from '~~/utils/behaviors'

const FIRST_BONUS = 1000
const CARD_COST = 500
const CARD_XP = 50
const NAME_MAX = 24

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ name?: string, tier?: string }>(event)

  const tierKey = body.tier ?? 'tier1'
  const tier = getCardTier(tierKey)
  const userXp = session.user.xp ?? 0

  if (tier.key !== tierKey) {
    throw createError({ statusCode: 400, statusMessage: 'Такого тира не существует' })
  }

  if (!isTierUnlocked(userXp, tierKey)) {
    throw createError({ statusCode: 400, statusMessage: `Тир «${tier.name}» откроется на ${tier.xp} XP` })
  }

  const rawName = (body.name ?? '').trim()
  const name = (rawName || `Карта «${tier.name}»`).slice(0, NAME_MAX)

  const userId = session.user.id

  const count = (db.prepare('SELECT COUNT(*) AS count FROM card WHERE userId = ?').get(userId) as { count: number }).count
  const user = db.prepare('SELECT balance, xp FROM user WHERE id = ?').get(userId) as { balance: number, xp: number }

  let balance = user.balance
  let bonus = 0
  let cost = 0
  let cardBalance = 0

  if (count > 0) {
    if (balance < CARD_COST) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей' })
    }
    cost = CARD_COST
    balance -= cost
  } else {
    bonus = FIRST_BONUS
    cardBalance = bonus
  }

  const xp = user.xp + CARD_XP
  const levelBefore = getLevelInfo(user.xp).current.level
  const levelAfter = getLevelInfo(xp).current.level

  const id = crypto.randomUUID()
  const tierLevel = CARD_TIERS.findIndex(item => item.key === tierKey) + 1
  const number = generateCardNumber(tierLevel)
  const last4 = number.slice(-4)
  const createdAt = Date.now()

  const mutated = Math.random() < 0.25
  const behavior = mutated ? rollBehavior() : 'normal'
  const mutations = mutated ? 1 : 0
  const mutationLog = mutated ? [{ from: tierKey, to: tierKey, at: createdAt }] : []

  db.prepare('INSERT INTO card (id, userId, name, tier, number, last4, color, balance, mutations, mutationLog, behavior, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, name, tierKey, number, last4, tier.color, cardBalance, mutations, JSON.stringify(mutationLog), behavior, createdAt)

  db.prepare('UPDATE user SET balance = ?, xp = ? WHERE id = ?').run(balance, xp, userId)

  return {
    card: {
      id,
      name,
      tier: tierKey,
      number,
      last4,
      color: tier.color,
      balance: cardBalance,
      mutations,
      mutationLog,
      behavior,
      createdAt
    },
    behavior: getCardBehavior(behavior),
    mutated,
    balance,
    xp,
    bonus,
    cost,
    leveledUp: levelAfter > levelBefore ? getLevelInfo(xp).current : null
  }
})
