<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

const { data: session } = await useAsyncData('roulette-session', () =>
  $fetch<{ user?: { balance?: number } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

const balance = ref(session.value?.user?.balance ?? 0)
const betAmount = ref(10)
const spinning = ref(false)

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

type Bet = {
  type: 'number' | 'color' | 'parity' | 'range' | 'dozen' | 'column'
  value: string
  amount: number
}

const bets = ref<Bet[]>([])

const lastResult = ref<{
  number: number
  color: string
  net: number
  totalReturn: number
  cashback: number
  cashbackRate: number
  results: { type: string, value: unknown, amount: number, win: boolean, multiplier: number, returnAmount: number }[]
} | null>(null)

const history = ref<{ number: number, color: string, net: number, at: number }[]>([])

const totalStake = computed(() => bets.value.reduce((sum, bet) => sum + bet.amount, 0))

function colorOf(number: number) {
  if (number === 0) return 'green'
  return RED_NUMBERS.has(number) ? 'red' : 'black'
}

function addBet(type: Bet['type'], value: string | number) {
  if (spinning.value) {
    return
  }
  const amount = Math.max(1, Math.floor(Number(betAmount.value) || 1))
  if (amount + totalStake.value > balance.value) {
    snackbar.show('Недостаточно Маннрублей на кошельке', 'error')
    return
  }
  const key = `${type}:${value}`
  const existing = bets.value.find(bet => `${bet.type}:${bet.value}` === key)
  if (existing) {
    existing.amount += amount
  } else {
    bets.value.push({ type, value: String(value), amount })
  }
}

function removeBet(index: number) {
  if (!spinning.value) {
    bets.value.splice(index, 1)
  }
}

function clearBets() {
  if (!spinning.value) {
    bets.value = []
  }
}

function doubleBet(amount: number) {
  betAmount.value = Math.max(1, amount * 2)
}

/* ═══ колесо ═══ */
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const WHEEL_R = 150
const STEP = 360 / 37

const wheelRotation = ref(0)
const ballRotation = ref(0)
const wheelSpinning = ref(false)

const sectors = WHEEL_ORDER.map((number, index) => {
  const start = index * STEP
  return {
    number,
    color: colorOf(number),
    start,
    center: start + STEP / 2
  }
})

function sectorPath(sector: { start: number }) {
  const a0 = sector.start * Math.PI / 180
  const a1 = (sector.start + STEP) * Math.PI / 180
  const p0 = { x: WHEEL_R * Math.sin(a0), y: -WHEEL_R * Math.cos(a0) }
  const p1 = { x: WHEEL_R * Math.sin(a1), y: -WHEEL_R * Math.cos(a1) }
  return `M 0 0 L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${WHEEL_R} ${WHEEL_R} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`
}

function labelTransform(sector: { center: number }) {
  const angle = sector.center
  const rad = angle * Math.PI / 180
  const x = (WHEEL_R * 0.78) * Math.sin(rad)
  const y = -(WHEEL_R * 0.78) * Math.cos(rad)
  return { x: x.toFixed(1), y: y.toFixed(1), rotate: (90 - angle).toFixed(1) }
}

function spin() {
  if (spinning.value || totalStake.value === 0) {
    return
  }
  if (totalStake.value > balance.value) {
    snackbar.show('Недостаточно Маннрублей на кошельке', 'error')
    return
  }
  spinning.value = true
  wheelSpinning.value = true
  lastResult.value = null

  $fetch<{
    number: number
    color: string
    results: { type: string, value: unknown, amount: number, win: boolean, multiplier: number, returnAmount: number }[]
    totalStake: number
    totalReturn: number
    net: number
    cashback: number
    cashbackRate: number
    balance: number
  }>('/api/roulette/spin', {
    method: 'POST',
    body: { bets: bets.value }
  })
    .then((response) => {
      animateWheel(response.number, response)
    })
    .catch((error) => {
      spinning.value = false
      wheelSpinning.value = false
      snackbar.show(
        error instanceof Error && 'data' in error
          ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
          : 'Ошибка',
        'error'
      )
    })
}

function animateWheel(number: number, response: {
  number: number
  color: string
  results: { type: string, value: unknown, amount: number, win: boolean, multiplier: number, returnAmount: number }[]
  totalStake: number
  totalReturn: number
  net: number
  cashback: number
  cashbackRate: number
  balance: number
}) {
  const sector = sectors[WHEEL_ORDER.indexOf(number)]!
  const spins = 5
  const targetWheel = spins * 360 + sector.center
  const DURATION = 4800
  const start = performance.now()

  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / DURATION)
    const eased = 1 - Math.pow(1 - progress, 4) /* easeOutQuart */
    wheelRotation.value = targetWheel * eased
    ballRotation.value = -spins * 360 * eased
    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      wheelSpinning.value = false
      finishSpin(response)
    }
  }
  requestAnimationFrame(tick)
}

function finishSpin(response: {
  number: number
  color: string
  results: { type: string, value: unknown, amount: number, win: boolean, multiplier: number, returnAmount: number }[]
  totalStake: number
  totalReturn: number
  net: number
  cashback: number
  cashbackRate: number
  balance: number
}) {
  balance.value = response.balance
  lastResult.value = {
    number: response.number,
    color: response.color,
    net: response.net,
    totalReturn: response.totalReturn,
    cashback: response.cashback,
    cashbackRate: response.cashbackRate,
    results: response.results
  }
  history.value = [{ number: response.number, color: response.color, net: response.net, at: Date.now() }, ...history.value].slice(0, 10)
  spinning.value = false
  bets.value = []
  if (response.net >= 0) {
    snackbar.show(`Выигрыш: +${response.net} МР! Число ${response.number} ${response.color}`, 'success')
  } else {
    snackbar.show(`Проигрыш: −${Math.abs(response.net)} МР. Выпало ${response.number} ${response.color}`, 'error')
  }
}

function betOnCell(type: Bet['type'], value: string | number) {
  addBet(type, value)
}

function cellClass(number: number) {
  return `roulette-cell roulette-cell--${colorOf(number)}`
}

function isBetOn(type: Bet['type'], value: string | number) {
  return bets.value.find(bet => bet.type === type && bet.value === String(value))
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-6">
      <div>
        <div class="text-overline text-secondary">
          казино
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          Рулетка
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          Кошелёк: <span class="font-weight-bold">{{ balance }} МР</span> · ставки:
          <span class="font-weight-bold">{{ totalStake }} МР</span>
        </p>
      </div>
    </div>

    <v-row>
      <v-col
        cols="12"
        md="7"
      >
        <v-card>
          <v-card-text>
            <div class="roulette-table">
              <div class="roulette-zero-row">
                <div
                  class="roulette-cell roulette-cell--green roulette-zero"
                  :class="{ 'roulette-cell--winner': lastResult?.number === 0 }"
                  @click="betOnCell('number', 0)"
                >
                  0
                  <span
                    v-if="isBetOn('number', 0)"
                    class="roulette-chip"
                  >
                    {{ isBetOn('number', 0)?.amount }}
                  </span>
                </div>
                <div class="roulette-columns">
                  <div
                    v-for="row in 12"
                    :key="row"
                    class="roulette-number-row"
                  >
                    <div
                      v-for="col in 3"
                      :key="col"
                      class="roulette-cell"
                      :class="[cellClass((row - 1) * 3 + col), { 'roulette-cell--winner': lastResult?.number === (row - 1) * 3 + col }]"
                      @click="betOnCell('number', (row - 1) * 3 + col)"
                    >
                      {{ (row - 1) * 3 + col }}
                      <span
                        v-if="isBetOn('number', (row - 1) * 3 + col)"
                        class="roulette-chip"
                      >
                        {{ isBetOn('number', (row - 1) * 3 + col)?.amount }}
                      </span>
                    </div>
                  </div>
                  <div class="roulette-column-bets">
                    <div
                      v-for="col in 3"
                      :key="col"
                      class="roulette-outside roulette-outside--column"
                      @click="betOnCell('column', col)"
                    >
                      2:1
                      <span
                        v-if="isBetOn('column', col)"
                        class="roulette-chip"
                      >
                        {{ isBetOn('column', col)?.amount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="roulette-outside-row">
                <div
                  class="roulette-outside"
                  @click="betOnCell('range', 'low')"
                >
                  1-18
                  <span
                    v-if="isBetOn('range', 'low')"
                    class="roulette-chip"
                  >
                    {{ isBetOn('range', 'low')?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside"
                  @click="betOnCell('parity', 'even')"
                >
                  ЧЁТ
                  <span
                    v-if="isBetOn('parity', 'even')"
                    class="roulette-chip"
                  >
                    {{ isBetOn('parity', 'even')?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside roulette-outside--red"
                  @click="betOnCell('color', 'red')"
                >
                  КРАСНОЕ
                  <span
                    v-if="isBetOn('color', 'red')"
                    class="roulette-chip"
                  >
                    {{ isBetOn('color', 'red')?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside roulette-outside--black"
                  @click="betOnCell('color', 'black')"
                >
                  ЧЁРНОЕ
                  <span
                    v-if="isBetOn('color', 'black')"
                    class="roulette-chip"
                  >
                    {{ isBetOn('color', 'black')?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside"
                  @click="betOnCell('parity', 'odd')"
                >
                  НЕЧЁТ
                  <span
                    v-if="isBetOn('parity', 'odd')"
                    class="roulette-chip"
                  >
                    {{ isBetOn('parity', 'odd')?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside"
                  @click="betOnCell('range', 'high')"
                >
                  19-36
                  <span
                    v-if="isBetOn('range', 'high')"
                    class="roulette-chip"
                  >
                    {{ isBetOn('range', 'high')?.amount }}
                  </span>
                </div>
              </div>

              <div class="roulette-outside-row">
                <div
                  class="roulette-outside"
                  @click="betOnCell('dozen', 1)"
                >
                  1-12
                  <span
                    v-if="isBetOn('dozen', 1)"
                    class="roulette-chip"
                  >
                    {{ isBetOn('dozen', 1)?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside"
                  @click="betOnCell('dozen', 2)"
                >
                  13-24
                  <span
                    v-if="isBetOn('dozen', 2)"
                    class="roulette-chip"
                  >
                    {{ isBetOn('dozen', 2)?.amount }}
                  </span>
                </div>
                <div
                  class="roulette-outside"
                  @click="betOnCell('dozen', 3)"
                >
                  25-36
                  <span
                    v-if="isBetOn('dozen', 3)"
                    class="roulette-chip"
                  >
                    {{ isBetOn('dozen', 3)?.amount }}
                  </span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="5"
      >
        <v-card class="mb-4">
          <v-card-text class="text-center">
            <div class="roulette-wheel-wrap">
              <div class="roulette-pointer" />
              <svg
                viewBox="-170 -170 340 340"
                class="roulette-wheel"
              >
                <defs>
                  <radialGradient id="wheelBg">
                    <stop
                      offset="0%"
                      stop-color="#1b1b1b"
                    />
                    <stop
                      offset="100%"
                      stop-color="#0d0d0d"
                    />
                  </radialGradient>
                </defs>
                <circle
                  r="164"
                  fill="url(#wheelBg)"
                />
                <g :style="{ transform: `rotate(${wheelRotation}deg)`, transformOrigin: '0 0' }">
                  <path
                    v-for="sector in sectors"
                    :key="sector.number"
                    :d="sectorPath(sector)"
                    :fill="sector.color === 'red' ? '#d32f2f' : sector.color === 'black' ? '#263238' : '#2e7d32'"
                    stroke="#0d0d0d"
                    stroke-width="1"
                  />
                  <text
                    v-for="sector in sectors"
                    :key="`t-${sector.number}`"
                    :transform="`translate(${labelTransform(sector).x} ${labelTransform(sector).y}) rotate(${labelTransform(sector).rotate})`"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill="#fff"
                    font-size="10"
                    font-weight="600"
                  >
                    {{ sector.number }}
                  </text>
                </g>
                <g :style="{ transform: `rotate(${ballRotation}deg)`, transformOrigin: '0 0' }">
                  <circle
                    cx="0"
                    cy="-140"
                    r="7"
                    fill="#fafafa"
                    stroke="#9e9e9e"
                    stroke-width="1.5"
                  />
                </g>
                <circle
                  r="34"
                  fill="#2e2e2e"
                  stroke="#555"
                  stroke-width="2"
                />
              </svg>
            </div>

            <v-alert
              v-if="lastResult"
              :type="lastResult.net >= 0 ? 'success' : 'error'"
              variant="tonal"
              class="mt-3"
            >
              <div class="text-body-medium font-weight-bold">
                Выпало {{ lastResult.number }} {{ lastResult.color }} ·
                {{ lastResult.net >= 0 ? `+${lastResult.net}` : `−${Math.abs(lastResult.net)}` }} МР
              </div>
              <div
                v-if="lastResult.cashback > 0"
                class="text-body-small"
              >
                Кэшбек с карт ({{ lastResult.cashbackRate }}%): +{{ lastResult.cashback }} МР
              </div>
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Ставка
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-text-field
              v-model.number="betAmount"
              label="Ставка за клик, МР"
              type="number"
              min="1"
              hide-details
              prepend-icon="payments"
              class="mb-3"
            />
            <div class="d-flex ga-2 mb-4">
              <v-btn
                size="small"
                variant="tonal"
                @click="betAmount = 10"
              >
                10
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="betAmount = 50"
              >
                50
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="betAmount = 100"
              >
                100
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="betAmount = 500"
              >
                500
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="doubleBet(betAmount)"
              >
                ×2
              </v-btn>
            </div>

            <div
              v-if="bets.length > 0"
              class="mb-4"
            >
              <div class="text-body-medium font-weight-bold mb-1">
                Ставки ({{ totalStake }} МР)
              </div>
              <v-list
                density="compact"
                class="pa-0"
              >
                <v-list-item
                  v-for="(bet, index) in bets"
                  :key="`${bet.type}:${bet.value}`"
                >
                  <v-list-item-title class="text-body-small">
                    {{ bet.type === 'number' ? `Число ${bet.value}` : bet.type === 'color' ? (bet.value === 'red' ? 'Красное' : 'Чёрное') : bet.type === 'parity' ? (bet.value === 'even' ? 'Чётное' : 'Нечётное') : bet.type === 'range' ? (bet.value === 'low' ? '1-18' : '19-36') : bet.type === 'dozen' ? `Дюжина ${bet.value}` : `Колонка ${bet.value}` }}
                    · {{ bet.amount }} МР
                  </v-list-item-title>
                  <template #append>
                    <v-btn
                      icon
                      variant="text"
                      size="x-small"
                      @click="removeBet(index)"
                    >
                      <v-icon icon="close" />
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <div class="d-flex ga-2">
              <v-btn
                variant="tonal"
                @click="clearBets"
              >
                Очистить
              </v-btn>
              <v-spacer />
              <v-btn
                color="primary"
                prepend-icon="casino"
                :loading="spinning"
                :disabled="spinning || totalStake === 0 || totalStake > balance"
                @click="spin"
              >
                {{ wheelSpinning ? 'Крутится…' : 'Крутить колесо' }}
              </v-btn>
            </div>

            <div
              v-if="history.length > 0"
              class="mt-5"
            >
              <div class="text-body-medium font-weight-bold mb-2">
                История
              </div>
              <v-list
                density="compact"
                class="pa-0"
              >
                <v-list-item
                  v-for="(item, index) in history"
                  :key="index"
                >
                  <template #prepend>
                    <span
                      class="history-number"
                      :style="{ background: item.color === 'red' ? '#d32f2f' : item.color === 'black' ? '#263238' : '#2e7d32' }"
                    >
                      {{ item.number }}
                    </span>
                  </template>
                  <v-list-item-title class="text-body-small">
                    {{ item.net >= 0 ? `+${item.net}` : `−${Math.abs(item.net)}` }} МР
                  </v-list-item-title>
                  <template #append>
                    <span class="text-body-small text-medium-emphasis">{{ formatTime(item.at) }}</span>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.roulette-table {
  user-select: none;
}

.roulette-zero-row {
  display: flex;
  gap: 6px;
}

.roulette-columns {
  flex: 1;
}

.roulette-zero {
  width: 56px;
  font-size: 18px;
}

.roulette-number-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.roulette-cell {
  position: relative;
  display: flex;
  flex: 1;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 100ms ease, transform 100ms ease;
}

.roulette-cell:hover {
  filter: brightness(1.2);
}

.roulette-cell:active {
  transform: scale(0.94);
}

.roulette-cell--red {
  background: #d32f2f;
}

.roulette-cell--black {
  background: #263238;
}

.roulette-cell--green {
  background: #2e7d32;
}

.roulette-cell--winner {
  box-shadow: 0 0 0 3px rgb(var(--v-theme-primary));
  animation: roulette-pulse 800ms ease-in-out infinite;
}

.roulette-chip {
  position: absolute;
  top: -9px;
  right: -9px;
  display: flex;
  min-width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
}

.roulette-column-bets {
  display: flex;
  gap: 6px;
}

.roulette-outside-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.roulette-outside {
  position: relative;
  display: flex;
  flex: 1;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 100ms ease;
}

.roulette-outside:hover {
  filter: brightness(1.1);
}

.roulette-outside--red {
  background: #d32f2f;
  color: #fff;
}

.roulette-outside--black {
  background: #263238;
  color: #fff;
}

.roulette-outside--column {
  height: 30px;
}

.roulette-wheel-wrap {
  position: relative;
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
}

.roulette-wheel {
  display: block;
  width: 100%;
  height: auto;
}

.roulette-pointer {
  position: absolute;
  z-index: 3;
  top: 4px;
  left: 50%;
  width: 0;
  height: 0;
  margin-left: -9px;
  border-right: 9px solid transparent;
  border-left: 9px solid transparent;
  border-top: 16px solid rgb(var(--v-theme-primary));
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}

.history-number {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

@keyframes roulette-pulse {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.45);
  }
}
</style>
