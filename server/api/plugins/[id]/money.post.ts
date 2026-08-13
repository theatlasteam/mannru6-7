import { auth, db } from '~~/server/utils/auth'
import {
  balanceOf,
  debitBalance,
  creditBalance,
  addLedger,
  userExists,
  ledgerById,
  settleExistsFor,
  closeLedger
} from '~~/server/utils/money'

const MIN_AMOUNT = 1
const MAX_AMOUNT = 1_000_000
const TRANSFER_FEE_PERCENT = 2

type MoneyOp = 'bet' | 'settle' | 'pay' | 'take' | 'transfer' | 'gift' | 'loan' | 'repay'

function validAmount(value: unknown): number {
  const amount = Math.floor(Number(value))
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    throw createError({ statusCode: 400, statusMessage: `Сумма должна быть от ${MIN_AMOUNT} до ${MAX_AMOUNT} МР` })
  }
  return amount
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const pluginId = getRouterParam(event, 'id')
  const body = await readBody<{ op?: unknown, amount?: unknown, to?: unknown, betId?: unknown, win?: unknown, interestPct?: unknown, loanId?: unknown }>(event)

  const op = body.op as MoneyOp
  if (!['bet', 'settle', 'pay', 'take', 'transfer', 'gift', 'loan', 'repay'].includes(op)) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестная операция' })
  }

  /* дом — владелец плагина, игрок — текущая сессия */
  const plugin = db.prepare('SELECT id, userId FROM plugin WHERE id = ?').get(pluginId) as
    | { id: string, userId: string }
    | undefined

  if (!plugin) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  const houseId = plugin.userId
  const playerId = session.user.id

  let from = ''
  let to = ''
  let amount = 0
  let fee = 0
  let reference = ''
  let status = 'done'

  if (op === 'bet') {
    /* игрок ставит: деньги уходят в дом, ставка держится в леджере как escrow */
    amount = validAmount(body.amount)
    from = playerId
    to = houseId
    if (!debitBalance(playerId, amount)) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей на кошельке' })
    }
    creditBalance(houseId, amount)
  } else if (op === 'settle') {
    /* дом рассчитывает ставку: выплата выигрыша игроку из баланса дома */
    const betId = String(body.betId ?? '')
    const bet = betId ? ledgerById(betId) : undefined
    if (!bet || bet.kind !== 'bet' || bet.pluginId !== pluginId || bet.fromUserId !== playerId || bet.toUserId !== houseId) {
      throw createError({ statusCode: 400, statusMessage: 'Ставка не найдена' })
    }
    if (bet.status !== 'done') {
      throw createError({ statusCode: 400, statusMessage: 'Ставка уже рассчитана' })
    }
    if (settleExistsFor(betId)) {
      throw createError({ statusCode: 400, statusMessage: 'Ставка уже рассчитана' })
    }
    const win = Math.max(0, Math.floor(Number(body.win)))
    if (!Number.isFinite(win) || win > MAX_AMOUNT) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный выигрыш' })
    }
    amount = bet.amount
    reference = betId
    from = houseId
    to = playerId
    if (win > 0) {
      if (!debitBalance(houseId, win)) {
        throw createError({ statusCode: 400, statusMessage: 'У дома недостаточно средств для выплаты' })
      }
      creditBalance(playerId, win)
    }
    closeLedger(betId)
  } else if (op === 'pay') {
    /* дом платит игроку (или любому пользователю) — призы, выигрыши */
    amount = validAmount(body.amount)
    const target = body.to ? String(body.to) : playerId
    if (!userExists(target)) {
      throw createError({ statusCode: 400, statusMessage: 'Получатель не найден' })
    }
    from = houseId
    to = target
    if (!debitBalance(houseId, amount)) {
      throw createError({ statusCode: 400, statusMessage: 'У дома недостаточно средств' })
    }
    creditBalance(target, amount)
  } else if (op === 'take') {
    /* дом забирает у игрока — штрафы, плата за вход */
    amount = validAmount(body.amount)
    from = playerId
    to = houseId
    if (!debitBalance(playerId, amount)) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей на кошельке' })
    }
    creditBalance(houseId, amount)
  } else if (op === 'transfer') {
    /* игрок переводит другому пользователю; комиссия 2% остаётся у дома */
    amount = validAmount(body.amount)
    const target = String(body.to ?? '')
    if (!target || !userExists(target)) {
      throw createError({ statusCode: 400, statusMessage: 'Получатель не найден' })
    }
    if (target === playerId) {
      throw createError({ statusCode: 400, statusMessage: 'Нельзя перевести самому себе' })
    }
    fee = Math.max(1, Math.floor((amount * TRANSFER_FEE_PERCENT) / 100))
    from = playerId
    to = target
    if (!debitBalance(playerId, amount + fee)) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей на кошельке (с учётом комиссии)' })
    }
    creditBalance(target, amount)
    creditBalance(houseId, fee)
  } else if (op === 'gift') {
    /* дом дарит игроку (или любому пользователю) */
    amount = validAmount(body.amount)
    const target = body.to ? String(body.to) : playerId
    if (!userExists(target)) {
      throw createError({ statusCode: 400, statusMessage: 'Получатель не найден' })
    }
    from = houseId
    to = target
    if (!debitBalance(houseId, amount)) {
      throw createError({ statusCode: 400, statusMessage: 'У дома недостаточно средств' })
    }
    creditBalance(target, amount)
  } else if (op === 'loan') {
    /* дом выдаёт займ игроку под процент; займ открыт до repay */
    amount = validAmount(body.amount)
    const interestPct = Math.max(0, Math.min(1000, Math.floor(Number(body.interestPct) || 0)))
    from = houseId
    to = playerId
    status = 'open'
    reference = String(interestPct)
    if (!debitBalance(houseId, amount)) {
      throw createError({ statusCode: 400, statusMessage: 'У дома недостаточно средств' })
    }
    creditBalance(playerId, amount)
  } else if (op === 'repay') {
    /* игрок возвращает займ с процентами дому */
    const loanId = String(body.loanId ?? '')
    const loan = loanId ? ledgerById(loanId) : undefined
    if (!loan || loan.kind !== 'loan' || loan.pluginId !== pluginId || loan.fromUserId !== houseId || loan.toUserId !== playerId) {
      throw createError({ statusCode: 400, statusMessage: 'Займ не найден' })
    }
    if (loan.status !== 'open') {
      throw createError({ statusCode: 400, statusMessage: 'Займ уже погашен' })
    }
    const interestPct = Number(loan.reference) || 0
    amount = loan.amount
    fee = Math.max(0, Math.round((loan.amount * interestPct) / 100))
    from = playerId
    to = houseId
    reference = loanId
    if (!debitBalance(playerId, amount + fee)) {
      throw createError({ statusCode: 400, statusMessage: 'Недостаточно Маннрублей для погашения займа' })
    }
    creditBalance(houseId, amount + fee)
    closeLedger(loanId)
  }

  const ledgerId = addLedger({ kind: op, pluginId, fromUserId: from || null, toUserId: to || null, amount, fee, reference, status })

  return {
    ok: true,
    op,
    ledgerId,
    amount,
    fee,
    from,
    to,
    balance: balanceOf(playerId),
    houseBalance: balanceOf(houseId)
  }
})
