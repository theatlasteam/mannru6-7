/* Mannru Random — генераторы случайностей для плагинов.
 * Чистый модуль: работает в GUI-окнах, таб-плагинах и серверных хуках. */
import { mannruUtils } from './utils'

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type SeededRng = {
  next(): number
  int(min: number, max: number): number
  float(min: number, max: number): number
  chance(probability: number): boolean
  pick<T>(items: T[]): T
  shuffle<T>(items: T[]): T[]
}

export const mannruRandom = {
  next(): number {
    return Math.random()
  },
  int(min: number, max: number): number {
    const lo = Math.ceil(min)
    const hi = Math.floor(max)
    if (hi < lo) {
      return lo
    }
    return Math.floor(Math.random() * (hi - lo + 1)) + lo
  },
  float(min: number, max: number): number {
    return min + Math.random() * (max - min)
  },
  chance(probability: number): boolean {
    return Math.random() < probability
  },
  coin(): boolean {
    return Math.random() < 0.5
  },
  pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)]!
  },
  weighted<T>(items: T[], weights: number[]): T {
    const total = mannruUtils.sum(weights.map(weight => Math.max(0, weight))) || 1
    let roll = Math.random() * total
    for (let index = 0; index < items.length; index++) {
      roll -= Math.max(0, weights[index] ?? 0)
      if (roll <= 0) {
        return items[index]!
      }
    }
    return items[items.length - 1]!
  },
  shuffle<T>(items: T[]): T[] {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index--) {
      const j = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[j]] = [copy[j]!, copy[index]!]
    }
    return copy
  },
  dice(sides = 6, count = 1): number {
    let sum = 0
    for (let index = 0; index < count; index++) {
      sum += mannruRandom.int(1, sides)
    }
    return sum
  },
  /* детерминированный генератор на сиде — одинаковые сиды дают одинаковые броски */
  prng(seed: number): SeededRng {
    const next = mulberry32(seed)
    return {
      next,
      int(min, max) {
        const lo = Math.ceil(min)
        const hi = Math.floor(max)
        if (hi < lo) {
          return lo
        }
        return Math.floor(next() * (hi - lo + 1)) + lo
      },
      float(min, max) {
        return min + next() * (max - min)
      },
      chance(probability) {
        return next() < probability
      },
      pick<T>(items: T[]): T {
        return items[Math.floor(next() * items.length)]!
      },
      shuffle<T>(items: T[]): T[] {
        const copy = [...items]
        for (let index = copy.length - 1; index > 0; index--) {
          const j = Math.floor(next() * (index + 1))
          ;[copy[index], copy[j]] = [copy[j]!, copy[index]!]
        }
        return copy
      }
    }
  },
  /* колода 52 карты: rank '2'..'A', suit '♠ ♥ ♦ ♣', value 2..14 */
  deck(): { rank: string, suit: string, value: number }[] {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const suits = ['♠', '♥', '♦', '♣']
    const deck: { rank: string, suit: string, value: number }[] = []
    for (const suit of suits) {
      ranks.forEach((rank, index) => {
        deck.push({ rank, suit, value: index + 2 })
      })
    }
    return mannruRandom.shuffle(deck)
  },
  /* слоты: каждый барабан — массив символов, один выпадает на каждом */
  slot(reels: unknown[][]): unknown[] {
    return reels.map(reel => mannruRandom.pick(reel))
  }
}

export type MannruRandom = typeof mannruRandom
