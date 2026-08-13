/* Mannru Creepto — Маннкоин-кликер для плагинов.
 * Курс, клики, апгрейд, конвертация. Обёртки над /api/creepto/*. */

export type CreeptoRate = {
  rate: number
  change: number
  ohlc: { date: number, open: number, high: number, low: number, close: number }
  history: { date: number, open: number, high: number, low: number, close: number }[]
}

export function createCreeptoClient(call: (url: string, options?: Record<string, unknown>) => Promise<unknown>) {
  return {
    /* курс + свечи: rate() → { rate, change, ohlc, history } */
    rate(): Promise<CreeptoRate> {
      return call('/api/creepto/rate') as Promise<CreeptoRate>
    },
    /* клик по Маннкоину: click() → { creepto, gained } */
    click(): Promise<{ creepto: number, gained: number }> {
      return call('/api/creepto/click', { method: 'POST' }) as Promise<{ creepto: number, gained: number }>
    },
    /* апгрейд силы клика: upgrade() → { creepto, clickPower, cost } */
    upgrade(): Promise<{ creepto: number, clickPower: number, cost: number }> {
      return call('/api/creepto/upgrade', { method: 'POST' }) as Promise<{ creepto: number, clickPower: number, cost: number }>
    },
    /* конвертация в МР: convert(cardId) → { creepto, cardBalance, convertedMp, rate } */
    convert(cardId: string): Promise<{ creepto: number, cardBalance: number, convertedMp: number, rate: number }> {
      return call('/api/creepto/convert', { method: 'POST', body: { cardId } }) as Promise<{ creepto: number, cardBalance: number, convertedMp: number, rate: number }>
    }
  }
}

export type MannruCreepto = ReturnType<typeof createCreeptoClient>
