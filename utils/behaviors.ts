export const CARD_BEHAVIORS = {
  normal: { name: 'Обычная', desc: 'Без особенностей' },
  greedy: { name: 'Жадная', desc: '+6.7% к каждому пополнению' },
  generous: { name: 'Щедрая', desc: '+6.7 МР к каждому снятию' },
  miner: { name: 'Майнер', desc: 'Каждое пополнение добывает +1 Маннкоин' },
  lucky: { name: 'Удачливая', desc: 'Мутации бесплатны' }
} as const

const MUTATED_BEHAVIORS = ['greedy', 'generous', 'miner', 'lucky'] as const

export function getCardBehavior(key: string) {
  return CARD_BEHAVIORS[key as keyof typeof CARD_BEHAVIORS] ?? CARD_BEHAVIORS.normal
}

export function rollBehavior(): string {
  return MUTATED_BEHAVIORS[Math.floor(Math.random() * MUTATED_BEHAVIORS.length)]!
}
