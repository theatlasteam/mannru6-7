<script setup lang="ts">
import { nextTick } from 'vue'
import { CARD_TIERS, getCardTier } from '~~/utils/levels'
import { getCardBehavior } from '~~/utils/behaviors'
import { formatCardNumber } from '~~/utils/cardnumber'

definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

type CardItem = {
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

type RollItem = { tier: string, behavior?: string, burned?: boolean }

type GambleResponse = {
  result: 'upgrade' | 'mutation' | 'loss'
  card: CardItem | null
  tier: typeof CARD_TIERS[number] | null
  behavior: { name: string, desc: string } | null
  mutated: boolean
  cost: number
  message: string
}

const ROLL_SLOT = 92
const ROLL_GAP = 10
const ROLL_VISIBLE = 5
const ROLL_PATTERN_SIZE = 12
const ROLL_REPEATS = 14
const ROLL_DURATION_MS = 5000
const MUTATED_BEHAVIORS = ['greedy', 'generous', 'miner', 'lucky']

const { data: cardsData } = await useFetch<{ cards: CardItem[] }>('/api/cards')
const cards = ref<CardItem[]>(cardsData.value?.cards ?? [])

const stake = ref<CardItem | null>(null)
const rollLineEl = ref<HTMLElement>()
const busy = ref(false)
const spinning = ref(false)
const snapping = ref(false)
const result = ref<GambleResponse | null>(null)
const rollSequence = ref<RollItem[]>([])
const rollOffset = ref(0)

const TIER_SLOT_HEX: Record<string, { bg: string, fg: string }> = {
  tier1: { bg: '#9DE258', fg: '#17240E' },
  tier2: { bg: '#558B2F', fg: '#FFFFFF' },
  tier3: { bg: '#1565C0', fg: '#FFFFFF' },
  tier4: { bg: '#AED581', fg: '#17240E' },
  tier5: { bg: '#AB47BC', fg: '#FFFFFF' }
}

function tierOf(card: { tier: string }) {
  return getCardTier(card.tier)
}

function slotStyle(item: RollItem) {
  if (item.burned) {
    return { background: '#37474F', color: '#FFD54F' }
  }
  const colors = TIER_SLOT_HEX[item.tier] ?? TIER_SLOT_HEX.tier1!
  return { background: colors.bg, color: colors.fg }
}

function resetRoll() {
  result.value = null
  rollSequence.value = []
  rollOffset.value = 0
  spinning.value = false
  snapping.value = false
}

function selectStake(card: CardItem) {
  if (spinning.value || busy.value) {
    return
  }
  stake.value = card
  resetRoll()
}

function buildRollSequence(final: GambleResponse): RollItem[] {
  /* бесконечная лента: один и тот же узор из 12 карт повторяется много раз —
   * рулетка никогда не «заканчивается», пока не приедет результат */
  const base: RollItem[] = []
  for (let index = 0; index < ROLL_PATTERN_SIZE; index++) {
    const tier = CARD_TIERS[Math.floor(Math.random() * CARD_TIERS.length)]!
    const mutated = Math.random() < 0.3
    base.push({
      tier: tier.key,
      behavior: mutated ? MUTATED_BEHAVIORS[Math.floor(Math.random() * MUTATED_BEHAVIORS.length)] : undefined
    })
  }
  const items: RollItem[] = []
  for (let repeat = 0; repeat < ROLL_REPEATS; repeat++) {
    items.push(...base)
  }
  if (final.result === 'loss') {
    items.push({ tier: 'tier1', burned: true })
  } else {
    items.push({ tier: final.card?.tier ?? 'tier1', behavior: final.card?.behavior })
  }
  return items
}

async function spinGamble() {
  if (!stake.value || busy.value || spinning.value) {
    return
  }
  const target = stake.value
  const spinToken = Symbol('spin')
  lastSpinToken.value = spinToken
  busy.value = true
  spinning.value = true
  snapping.value = true
  result.value = null
  rollSequence.value = []
  rollOffset.value = 0

  let response: GambleResponse | null = null
  try {
    response = await $fetch<GambleResponse>(`/api/cards/${target.id}/gamble`, { method: 'POST' })
  } catch (error) {
    spinning.value = false
    snapping.value = false
    busy.value = false
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
    return
  }

  /* лента строится и только после коммита DOM сдвигается — переход всегда видим */
  rollSequence.value = buildRollSequence(response)
  await nextTick()
  if (spinToken !== lastSpinToken.value) {
    return
  }
  const resultIndex = rollSequence.value.length - 1
  const step = ROLL_SLOT + ROLL_GAP
  const lineWidth = rollLineEl.value?.clientWidth ?? ROLL_VISIBLE * step
  const targetOffset = resultIndex * step + ROLL_SLOT / 2 - lineWidth / 2
  snapping.value = false
  rollOffset.value = targetOffset

  await new Promise(resolve => setTimeout(resolve, ROLL_DURATION_MS))
  if (spinToken !== lastSpinToken.value) {
    return
  }
  /* доводка: слот результата ровно под маркером */
  snapping.value = true
  rollOffset.value = targetOffset
  await new Promise(resolve => setTimeout(resolve, 220))
  if (spinToken !== lastSpinToken.value) {
    return
  }
  snapping.value = false
  finishGamble(response)
  busy.value = false
}

const lastSpinToken = ref<symbol | null>(null)

function finishGamble(response: GambleResponse) {
  result.value = response
  spinning.value = false
  if (response.result === 'loss') {
    const lostId = stake.value?.id
    stake.value = null
    if (lostId) {
      cards.value = cards.value.filter(card => card.id !== lostId)
    }
  } else if (response.card) {
    const index = cards.value.findIndex(card => card.id === response.card?.id)
    if (index !== -1) {
      cards.value[index] = response.card
    }
    stake.value = response.card
  }
  snackbar.show(response.message, response.result === 'loss' ? 'error' : 'success')
}

const hasCards = computed(() => cards.value.length > 0)
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-8">
      <div>
        <div class="text-overline text-secondary">
          казино
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          Рулетка карт
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          Поставьте карту на кон. Рулетка может поднять её тир с мутацией — или сжечь без следа.
        </p>
      </div>
    </div>

    <v-card class="mb-6">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        1 · Ставка
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div
          v-if="hasCards"
          class="stake-row"
        >
          <button
            v-for="card in cards"
            :key="card.id"
            type="button"
            class="stake-card"
            :class="[
              `mannru-card--${tierOf(card).deco}`,
              `mannru-card--${card.behavior}`,
              {
                'stake-card--selected': stake?.id === card.id,
                'mannru-card--mutated': card.mutations > 0
              }
            ]"
            @click="selectStake(card)"
          >
            <span class="stake-card__emblem">{{ tierOf(card).emblem }}</span>
            <span class="stake-card__name">{{ card.name }}</span>
            <span class="stake-card__tier">{{ tierOf(card).name }}</span>
            <span class="stake-card__balance">{{ card.balance }} МР</span>
            <span
              v-if="card.behavior !== 'normal'"
              class="stake-card__behavior"
            >
              {{ getCardBehavior(card.behavior).name }}
            </span>
          </button>
        </div>

        <div
          v-else
          class="pa-4 text-center"
        >
          <v-icon
            icon="casino"
            size="44"
            class="mb-2"
          />
          <p class="text-body-medium font-weight-bold mb-1">
            Ставить нечего
          </p>
          <p class="text-body-small text-medium-emphasis mb-3">
            Чтобы играть, сначала выпустите карту на странице карт.
          </p>
          <v-btn
            color="primary"
            size="small"
            prepend-icon="credit_card"
            @click="navigateTo('/cards')"
          >
            Создать карту
          </v-btn>
        </div>

        <p
          v-if="stake"
          class="text-body-small text-medium-emphasis mt-3 mb-0"
        >
          Ставка: «{{ stake.name }}» ·
          <template v-if="stake.behavior === 'lucky'">
            <span class="font-weight-bold text-success">бесплатно — Удачливая!</span>
          </template>
          <template v-else>
            стоимость <span class="font-weight-bold">300 МР</span> с баланса карты
          </template>
        </p>
        <p
          v-else-if="hasCards"
          class="text-body-small text-medium-emphasis mt-3 mb-0"
        >
          Выберите карту — она будет поставлена на кон.
        </p>
      </v-card-text>
    </v-card>

      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          2 · Крутить
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div
            ref="rollLineEl"
            class="roll-line"
          >
            <div
              class="roll-strip"
              :class="{ 'roll-strip--fast': !spinning || snapping }"
              :style="{ transform: `translateX(-${rollOffset}px)` }"
            >
              <template v-if="rollSequence.length > 0">
                <div
                  v-for="(item, index) in rollSequence"
                  :key="index"
                  class="roll-slot"
                  :class="[
                    `mannru-card--${tierOf(item).deco}`,
                    item.behavior ? `roll-slot--${item.behavior}` : '',
                    { 'roll-slot--burned': item.burned }
                  ]"
                  :style="slotStyle(item)"
                >
                  <span class="roll-slot__emblem">{{ tierOf(item).emblem }}</span>
                  <span class="roll-slot__name">{{ tierOf(item).name }}</span>
                  <span class="roll-slot__meta">67 · {{ tierOf(item).badge.toUpperCase() }}</span>
                  <span
                    v-if="item.burned"
                    class="roll-slot__cross"
                  >
                    💀
                  </span>
                </div>
              </template>
              <div
                v-else
                class="roll-placeholder"
              >
                <v-icon
                  icon="casino"
                  class="me-2"
                />
                {{ stake ? 'Крутите рулетку!' : 'Сначала выберите карту' }}
              </div>
            </div>
            <div
              v-if="rollSequence.length > 0"
              class="roll-marker"
            />
          </div>

          <v-alert
            v-if="result"
            :type="result.result === 'loss' ? 'error' : 'success'"
            variant="tonal"
            class="mt-4"
          >
            <template v-if="result.result === 'loss'">
              <div class="text-body-medium font-weight-bold">
                💀 Карта сгорела
              </div>
              <div class="text-body-small">
                {{ result.message }}
              </div>
            </template>
            <template v-else-if="result.result === 'upgrade'">
              <div class="text-body-medium font-weight-bold">
                ПОВЫШЕНИЕ: тир «{{ result.tier?.name }}» + мутация!
              </div>
              <div class="text-body-small">
                {{ result.message }}
              </div>
            </template>
            <template v-else>
              <div class="text-body-medium font-weight-bold">
                Мутация!
              </div>
              <div class="text-body-small">
                {{ result.message }}
              </div>
            </template>

            <div
              v-if="result.card"
              class="mt-3"
            >
              <div
                :color="tierOf(result.card).color"
                class="mannru-card result-card pa-4"
                :class="[
                  `mannru-card--${tierOf(result.card).deco}`,
                  `mannru-card--${result.card.behavior}`,
                  { 'mannru-card--mutated': result.card.mutations > 0 }
                ]"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-body-medium font-weight-bold">
                      {{ result.card.name }}
                    </div>
                    <div class="text-body-small mannru-card__muted">
                      {{ tierOf(result.card).name }} · {{ formatCardNumber(result.card.number) }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-body-small mannru-card__muted">
                      баланс
                    </div>
                    <div class="text-h6 font-weight-bold">
                      {{ result.card.balance }} МР
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <div class="text-body-small text-medium-emphasis flex-grow-1">
            <template v-if="result">
              <template v-if="result.result === 'loss'">
                Потерянная карта больше не вернётся. Выберите новую ставку.
              </template>
              <template v-else>
                Карта обновлена: «{{ result.card?.name }}» ·
                {{ result.card?.balance }} МР · мутаций ×{{ result.card?.mutations }}
              </template>
            </template>
            <template v-else>
              Шансы: <span class="font-weight-bold">35%</span> потерять карту ·
              <span class="font-weight-bold">30%</span> повышение +
              <span class="font-weight-bold">35%</span> мутация
            </template>
          </div>
          <v-btn
            variant="text"
            :disabled="spinning"
            @click="stake = null"
          >
            Сменить карту
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="casino"
            :loading="busy"
            :disabled="!stake || spinning || result?.result === 'loss'"
            @click="spinGamble"
          >
            {{ spinning ? 'Крутится…' : result ? 'Крутить ещё' : 'Крутить' }}
          </v-btn>
        </v-card-actions>
      </v-card>
  </v-container>
</template>

<style scoped>
.stake-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.stake-card {
  position: relative;
  flex: 0 0 auto;
  width: 150px;
  padding: 12px;
  overflow: hidden;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, transform 120ms ease;
}

.stake-card:hover {
  transform: translateY(-2px);
}

.stake-card--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary) / 0.08);
}

.stake-card__emblem {
  position: absolute;
  top: 2px;
  right: 6px;
  font-size: 34px;
  font-weight: 900;
  opacity: 0.18;
  transform: rotate(8deg);
}

.stake-card__name {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.stake-card__tier {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  opacity: 0.7;
}

.stake-card__balance {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
}

.stake-card__behavior {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary) / 0.2);
  color: rgb(var(--v-theme-primary));
  font-size: 10px;
  font-weight: 700;
}

.roll-line {
  position: relative;
  overflow: hidden;
  padding: 12px 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-variant));
}

.roll-strip {
  display: flex;
  gap: 10px;
  padding: 0 4px;
  will-change: transform;
  transition: transform 5s cubic-bezier(0.08, 0.55, 0.15, 1);
}

.roll-strip--fast {
  transition: transform 160ms cubic-bezier(0.3, 0.8, 0.4, 1);
}

.roll-slot {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  width: 92px;
  height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 10px;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.roll-slot__emblem,
.roll-slot__name,
.roll-slot__meta,
.roll-slot__cross {
  position: relative;
  z-index: 1;
}

.roll-slot__emblem {
  position: absolute;
  z-index: 0;
  top: -8px;
  right: -2px;
  font-size: 40px;
  line-height: 1;
  opacity: 0.2;
  transform: rotate(8deg);
}

.roll-slot__name {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
}

.roll-slot__meta {
  margin-top: 2px;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.08em;
  opacity: 0.75;
}

.roll-slot__cross {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 900;
  color: #ffd54f;
  background: rgba(0, 0, 0, 0.55);
}

.roll-slot--burned {
  background: #37474f !important;
  color: #ffd54f !important;
}

/* мини-ауры поведений на слотах рулетки */
.roll-slot--greedy::after,
.roll-slot--generous::after,
.roll-slot--miner::after,
.roll-slot--lucky::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  aspect-ratio: 1 / 1;
  content: '';
  pointer-events: none;
}

.roll-slot--greedy::after {
  background: conic-gradient(from 0deg, #ffd54f, #ffb300, #ffe082, #ff8f00, #ffd54f);
  filter: blur(5px);
  mix-blend-mode: screen;
  opacity: 0.85;
  animation: roll-spin 7s linear infinite;
}

.roll-slot--generous::after {
  background: radial-gradient(circle at 50% 50%, #f06292 0%, #ce93d8 45%, transparent 70%);
  filter: blur(5px);
  mix-blend-mode: screen;
  opacity: 0.85;
  animation: roll-pulse 3s ease-in-out infinite;
}

.roll-slot--miner::after {
  background:
    radial-gradient(circle at 25% 30%, rgba(0, 229, 255, 0.85) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 70% 25%, rgba(0, 229, 255, 0.7) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 45% 70%, rgba(0, 229, 255, 0.8) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 85% 75%, rgba(0, 229, 255, 0.6) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 50% 50%, rgba(0, 188, 212, 0.5) 0%, rgba(1, 87, 155, 0.3) 60%, transparent 75%);
  mix-blend-mode: screen;
  opacity: 0.95;
  animation: roll-twinkle 2.4s ease-in-out infinite;
}

.roll-slot--lucky::after {
  background: conic-gradient(from 0deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #b197fc, #ff6b6b);
  filter: blur(6px);
  mix-blend-mode: screen;
  opacity: 0.9;
  animation: roll-spin 6s linear infinite;
}

@keyframes roll-spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes roll-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.75;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.18);
    opacity: 0.95;
  }
}

@keyframes roll-twinkle {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
}

.roll-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 92px;
  margin-left: -46px;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 12px;
  pointer-events: none;
}

.roll-placeholder {
  display: flex;
  height: 58px;
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.55;
  font-size: 14px;
}

.result-card {
  max-width: 340px;
}
</style>
