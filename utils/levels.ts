export const LEVELS = [
  { level: 1, xp: 0, title: 'Новичок воображения' },
  { level: 2, xp: 100, title: 'Мемель' },
  { level: 3, xp: 250, title: 'Вкладчик' },
  { level: 4, xp: 500, title: 'Процентщик' },
  { level: 5, xp: 1000, title: 'Олигарх' },
  { level: 6, xp: 2000, title: 'Банкир 6.7' },
  { level: 7, xp: 4000, title: 'Хозяин Маннру' },
  { level: 8, xp: 8000, title: 'Легенда версии 7.0' }
]

export function getLevelInfo(xp: number) {
  let current = LEVELS[0]!
  let next: typeof LEVELS[number] | null = LEVELS[1] ?? null

  for (const item of LEVELS) {
    if (xp >= item.xp) {
      current = item
      next = LEVELS[LEVELS.indexOf(item) + 1] ?? null
    }
  }

  const span = next ? next.xp - current.xp : 0
  const progress = next ? Math.min(100, ((xp - current.xp) / span) * 100) : 100

  return {
    current,
    next,
    progress,
    need: next ? next.xp - xp : 0
  }
}

export const CARD_TIERS = [
  { key: 'tier1', xp: 0, name: 'Шесть семь', color: 'primary', badge: 'классика', emblem: '67', deco: 'dots' },
  { key: 'tier2', xp: 150, name: 'Мемель', color: 'secondary', badge: 'мем', emblem: '😄', deco: 'stripes' },
  { key: 'tier3', xp: 400, name: 'Процентщик', color: 'info', badge: 'проценты', emblem: '%', deco: 'rings' },
  { key: 'tier4', xp: 1000, name: 'Олигарх', color: 'success', badge: 'воображение', emblem: '₽', deco: 'coins' },
  { key: 'tier5', xp: 2500, name: 'Банкир 6.7', color: 'purple', badge: 'финал', emblem: '✦', deco: 'diamonds' }
] as const

export type CardTierKey = typeof CARD_TIERS[number]['key']

export function getCardTier(key: string) {
  return CARD_TIERS.find(tier => tier.key === key) ?? CARD_TIERS[0]!
}

export function isTierUnlocked(xp: number, key: string) {
  return xp >= getCardTier(key).xp
}
