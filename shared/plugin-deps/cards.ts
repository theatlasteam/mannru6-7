/* Mannru Cards — банковские карты для плагинов.
 * Обёртки над API карт: выпуск, переводы, мутации, гадание, удаление.
 * Вызовы идут через сервер с проверкой владельца (как обычный fetchJson). */

export type BankCard = {
  id: string
  name: string
  tier: string
  number: string
  last4: string
  color: string
  balance: number
  mutations: number
  mutationLog: { from: string, to: string, at: number }[]
  behavior: string
  createdAt: number
}

export function createCardsClient(call: (url: string, options?: Record<string, unknown>) => Promise<unknown>) {
  return {
    /* мои карты: list() → { cards: BankCard[] } */
    list(): Promise<{ cards: BankCard[] }> {
      return call('/api/cards') as Promise<{ cards: BankCard[] }>
    },
    /* выпустить карту: create({ name?, tier? }) → { card, balance, xp, mutated, ... } */
    create(options?: { name?: string, tier?: string }): Promise<unknown> {
      return call('/api/cards', { method: 'POST', body: options ?? {} })
    },
    /* перевод: transfer(cardId, amount, direction?) — 'to-card' | 'to-wallet' */
    transfer(cardId: string, amount: number, direction = 'to-card'): Promise<unknown> {
      return call(`/api/cards/${cardId}/transfer`, { method: 'POST', body: { amount, direction } })
    },
    /* мутация: mutate(cardId, name?) → { card, tier, cost } */
    mutate(cardId: string, name?: string): Promise<unknown> {
      return call(`/api/cards/${cardId}/mutate`, { method: 'POST', body: { name } })
    },
    /* гадание: gamble(cardId) → { result: 'upgrade'|'mutation'|'loss', card, ... } */
    gamble(cardId: string): Promise<unknown> {
      return call(`/api/cards/${cardId}/gamble`, { method: 'POST' })
    },
    /* уничтожить карту: remove(cardId) → { ok } */
    remove(cardId: string): Promise<unknown> {
      return call(`/api/cards/${cardId}`, { method: 'DELETE' })
    }
  }
}

export type MannruCards = ReturnType<typeof createCardsClient>
