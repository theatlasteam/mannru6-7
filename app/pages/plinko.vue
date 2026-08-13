<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

const { data: session } = await useAsyncData('plinko-session', () =>
  $fetch<{ user?: { balance?: number } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

const balance = ref(session.value?.user?.balance ?? 0)
const amount = ref(50)
const rows = ref<8 | 16>(16)

const lastResult = ref<{
  bucket: number
  multiplier: number
  win: number
  profit: number
  cashback: number
  cashbackRate: number
  balance: number
} | null>(null)

const history = ref<{ bucket: number, multiplier: number, win: number, rows: number, at: number }[]>([])

/* ═══ доска ═══ */
/* шаг пинов меньше диаметра мяча — классическая плинко-решётка */
const PIN_DX = 24
const PIN_DY = Math.round(PIN_DX * Math.sqrt(3) / 2) /* сотовый шаг по вертикали */
const PAD = 28
const PAD_TOP = 52
const BALL_R = 6
const PIN_R = 3.5
const BUCKET_H = 52

const boardWidth = computed(() => PAD * 2 + rows.value * PIN_DX)
const boardHeight = computed(() => PAD_TOP + rows.value * PIN_DY + BUCKET_H)
const boardBottom = computed(() => PAD_TOP + rows.value * PIN_DY)
const floorY = computed(() => boardBottom.value + BUCKET_H)

/* треугольник из сотовой решётки: ряд r содержит r+1 пинов,
 * чётные ряды — на целых шагах, нечётные — на полушагах (соты) */
function pinPositions(rowCount: number) {
  const list: { x: number, y: number }[] = []
  const center = (PAD + rowCount * PIN_DX) / 2
  for (let row = 0; row < rowCount; row++) {
    const count = row + 1
    const half = row / 2
    for (let index = 0; index < count; index++) {
      list.push({ x: center + (index - half) * PIN_DX, y: PAD_TOP + row * PIN_DY })
    }
  }
  return list
}

const pins = computed(() => pinPositions(rows.value))

function bucketPositions(rowCount: number) {
  const list: { x: number, bucket: number }[] = []
  const center = (PAD + rowCount * PIN_DX) / 2
  for (let bucket = 0; bucket <= rowCount; bucket++) {
    list.push({ x: center + (bucket - rowCount / 2) * PIN_DX, bucket })
  }
  return list
}

const buckets = computed(() => bucketPositions(rows.value))

function bucketColor(bucket: number) {
  const mid = rows.value / 2
  const distance = Math.abs(bucket - mid) / (rows.value / 2)
  if (distance > 0.6) return '#ef4444'
  if (distance > 0.35) return '#f97316'
  if (distance > 0.12) return '#eab308'
  return '#22c55e'
}

function bucketLabels(rowCount: number) {
  return rowCount === 8
    ? [8, 3, 1.5, 0.6, 0.5, 0.6, 1.5, 3, 8]
    : [120, 44, 16, 6, 2.2, 1.2, 0.7, 0.6, 0.5, 0.6, 0.7, 1.2, 2.2, 6, 16, 44, 120]
}

/* ═══ отрисовка ═══ */
const canvasEl = ref<HTMLCanvasElement>()
const boardEl = ref<HTMLElement>()
const ctx2d = ref<CanvasRenderingContext2D | null>(null)
let cssScale = 1

type ActiveBall = {
  id: number
  points: { x: number, y: number }[]
  response: { bucket: number, multiplier: number, win: number, profit: number, cashback: number, cashbackRate: number, balance: number }
  pos: { x: number, y: number }
  stepIndex: number
  stepStart: number
  wobbleSeed: number
  done: boolean
}

const balls = ref<ActiveBall[]>([])
const ballVisible = ref(false)
let ballId = 0
let rafId = 0
let animStarted = false

function resizeCanvas() {
  const canvas = canvasEl.value
  const container = boardEl.value
  if (!canvas || !container) {
    return
  }
  const dpr = window.devicePixelRatio || 1
  const cssWidth = Math.max(120, container.clientWidth)
  cssScale = cssWidth / boardWidth.value
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssWidth * (boardHeight.value / boardWidth.value)}px`
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssWidth * (boardHeight.value / boardWidth.value) * dpr)
  ctx2d.value = canvas.getContext('2d')
}

function drawBoard() {
  const canvas = canvasEl.value
  const context = ctx2d.value
  if (!canvas || !context) {
    return
  }
  const dpr = window.devicePixelRatio || 1
  context.setTransform(cssScale * dpr, 0, 0, cssScale * dpr, 0, 0)
  context.clearRect(0, 0, boardWidth.value, boardHeight.value)

  const labels = bucketLabels(rows.value)

  /* фон корзин */
  const bucketBg = context.createLinearGradient(0, boardBottom.value, 0, floorY.value)
  bucketBg.addColorStop(0, 'rgba(0,0,0,0.06)')
  bucketBg.addColorStop(1, 'rgba(0,0,0,0.02)')
  context.fillStyle = bucketBg
  context.fillRect(0, boardBottom.value, boardWidth.value, BUCKET_H)

  /* корзины: перегородки, подсветка, множители */
  for (const bucket of buckets.value) {
    const color = bucketColor(bucket.bucket)
    const dividerX = bucket.x - PIN_DX / 2
    if (dividerX > 0) {
      context.strokeStyle = 'rgba(0,0,0,0.22)'
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(dividerX, boardBottom.value + 4)
      context.lineTo(dividerX, floorY.value - 6)
      context.stroke()
    }
    context.fillStyle = color
    context.font = '700 11.5px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(`×${labels[bucket.bucket]}`, bucket.x, floorY.value - 12)
  }

  /* пины: тёмный ободок + светлый центр */
  for (const pin of pins.value) {
    context.fillStyle = 'rgba(0,0,0,0.45)'
    context.beginPath()
    context.arc(pin.x, pin.y + 0.8, PIN_R + 0.8, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = 'rgba(255,255,255,0.9)'
    context.beginPath()
    context.arc(pin.x, pin.y, PIN_R, 0, Math.PI * 2)
    context.fill()
  }

  /* мячи: градиент + блик + тень — одновременно летят все активные */
  for (const ball of balls.value) {
    if (ball.done) {
      continue
    }
    const { x, y } = ball.pos
    context.save()
    context.shadowColor = 'rgba(234,179,8,0.5)'
    context.shadowBlur = 8
    const gradient = context.createRadialGradient(x - 2.5, y - 3, 1, x, y, BALL_R + 1)
    gradient.addColorStop(0, '#fde68a')
    gradient.addColorStop(0.55, '#eab308')
    gradient.addColorStop(1, '#a16207')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, BALL_R, 0, Math.PI * 2)
    context.fill()
    context.restore()
    context.fillStyle = 'rgba(255,255,255,0.9)'
    context.beginPath()
    context.arc(x - 2, y - 2.5, 1.8, 0, Math.PI * 2)
    context.fill()
  }
}

/* ═══ игра ═══ */
function play() {
  const bet = Math.floor(Number(amount.value))
  if (!Number.isFinite(bet) || bet < 1) {
    snackbar.show('Ставка — минимум 1 МР', 'error')
    return
  }
  if (balls.value.length >= 10) {
    snackbar.show('Слишком много мячей в полёте', 'warning')
    return
  }

  $fetch<{
    path: ('l' | 'r')[]
    rows: number
    bucket: number
    multiplier: number
    win: number
    profit: number
    cashback: number
    cashbackRate: number
    balance: number
  }>('/api/plinko/play', {
    method: 'POST',
    body: { amount: bet, rows: rows.value }
  })
    .then((response) => {
      const ball = createBall(response.path, response)
      balls.value.push(ball)
      ballVisible.value = true
      startAnimation()
    })
    .catch((error) => {
      snackbar.show(
        error instanceof Error && 'data' in error
          ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
          : 'Ошибка',
        'error'
      )
    })
}

/* мяч скачет с пина на пин по официальной траектории: дуги с гравитацией,
 * финальная точка — ровно центр выигрышной корзины */
function createBall(path: ('l' | 'r')[], response: { bucket: number, rows: number, multiplier: number, win: number, profit: number, cashback: number, cashbackRate: number, balance: number }): ActiveBall {
  const center = (PAD + rows.value * PIN_DX) / 2

  const points: { x: number, y: number }[] = []
  let bounces = 0
  path.forEach((side, index) => {
    if (side === 'r') {
      bounces++
    }
    const row = index + 1
    points.push({
      x: center + (bounces - row / 2) * PIN_DX,
      /* мяч останавливается НА пине, а не внутри него */
      y: PAD_TOP + row * PIN_DY - BALL_R - PIN_R - 0.5
    })
  })
  const finalX = center + (response.bucket - rows.value / 2) * PIN_DX
  points.push({ x: finalX, y: floorY.value - 10 })

  return {
    id: ++ballId,
    points,
    response: {
      bucket: response.bucket,
      multiplier: response.multiplier,
      win: response.win,
      profit: response.profit,
      cashback: response.cashback,
      cashbackRate: response.cashbackRate,
      balance: response.balance
    },
    pos: { x: center, y: PAD_TOP - 14 },
    stepIndex: 0,
    stepStart: 0,
    wobbleSeed: Math.random(),
    done: false
  }
}

const STEP_MS = 150
const SAG = 8 /* провисание дуги — гравитация */

function startAnimation() {
  if (animStarted) {
    return
  }
  animStarted = true
  const tick = (now: number) => {
    let finished: ActiveBall | null = null
    for (const ball of balls.value) {
      if (ball.done) {
        continue
      }
      if (ball.stepIndex >= ball.points.length) {
        ball.done = true
        finished = ball
        continue
      }
      if (ball.stepStart === 0) {
        ball.stepStart = now
      }
      const from = ball.stepIndex === 0
        ? { x: ball.points[0]!.x, y: PAD_TOP - 14 }
        : ball.points[ball.stepIndex - 1]!
      const to = ball.points[ball.stepIndex]!
      const progress = Math.min(1, (now - ball.stepStart) / STEP_MS)
      /* живой разброс: каждая дуга слегка своя, но мяч всегда попадает на пин */
      const wobble = Math.sin(progress * Math.PI) * ((ball.wobbleSeed * 3) - 1.5)
      ball.pos = {
        x: from.x + (to.x - from.x) * progress + wobble,
        y: from.y + (to.y - from.y) * progress + SAG * Math.sin(progress * Math.PI)
      }
      if (progress >= 1) {
        ball.pos = { x: to.x, y: to.y }
        ball.stepIndex++
        ball.stepStart = 0
      }
    }
    drawBoard()
    if (finished) {
      finishGame(finished.response)
      balls.value = balls.value.filter(ball => ball !== finished)
    }
    if (balls.value.length === 0) {
      animStarted = false
      ballVisible.value = false
      return
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function finishGame(response: { bucket: number, multiplier: number, win: number, profit: number, cashback: number, cashbackRate: number, balance: number }) {
  const result = {
    bucket: response.bucket,
    multiplier: response.multiplier,
    win: response.win,
    profit: response.profit,
    cashback: response.cashback,
    cashbackRate: response.cashbackRate,
    balance: response.balance
  }
  lastResult.value = result
  balance.value = response.balance
  history.value = [{ bucket: result.bucket, multiplier: result.multiplier, win: result.win, rows: rows.value, at: Date.now() }, ...history.value].slice(0, 20)
  if (result.profit >= 0) {
    snackbar.show(`+${result.win} МР (×${result.multiplier})`, 'success')
  } else {
    snackbar.show(`Проигрыш: −${Math.abs(result.profit)} МР`, 'error')
  }
}

function setRows(value: 8 | 16) {
  if (balls.value.length > 0) {
    snackbar.show('Дождитесь окончания полёта мячей', 'warning')
    return
  }
  rows.value = value
  ballVisible.value = false
  cancelAnimationFrame(rafId)
  resizeCanvas()
  drawBoard()
}

function onResize() {
  if (balls.value.length === 0) {
    resizeCanvas()
    drawBoard()
  }
}

function quickBet(multiplier: number) {
  amount.value = Math.max(1, Math.floor(Number(amount.value) * multiplier))
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(() => {
  resizeCanvas()
  drawBoard()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-6">
      <div>
        <div class="text-overline text-secondary">
          казино
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          Плинко
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          Кошелёк: <span class="font-weight-bold">{{ balance }} МР</span> · бросьте мяч и поймайте множитель
        </p>
      </div>
    </div>

    <v-row>
      <v-col
        cols="12"
        md="8"
      >
        <v-card>
          <v-card-text class="text-center">
            <div
              ref="boardEl"
              class="plinko-board"
            >
              <canvas
                ref="canvasEl"
                class="plinko-canvas"
              />
            </div>

            <v-alert
              v-if="lastResult"
              :type="lastResult.profit >= 0 ? 'success' : 'error'"
              variant="tonal"
              class="mt-3"
            >
              <template v-if="lastResult.profit >= 0">
                <div class="text-body-medium font-weight-bold">
                  Выигрыш: +{{ lastResult.win }} МР (×{{ lastResult.multiplier }})
                </div>
              </template>
              <template v-else>
                <div class="text-body-medium font-weight-bold">
                  Проигрыш: −{{ Math.abs(lastResult.profit) }} МР
                </div>
              </template>
              <div
                v-if="lastResult.cashback > 0"
                class="text-body-small"
              >
                Кэшбек с карт ({{ lastResult.cashbackRate }}%): +{{ lastResult.cashback }} МР
              </div>
              <div class="text-body-small">
                Кошелёк: {{ balance }} МР
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="4"
      >
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Ставка
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-text-field
              v-model.number="amount"
              label="Ставка, МР"
              type="number"
              min="1"
              hide-details
              prepend-icon="payments"
              class="mb-4"
            />
            <div class="d-flex ga-2 mb-4">
              <v-btn
                size="small"
                variant="tonal"
                @click="quickBet(0.5)"
              >
                ×½
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="quickBet(2)"
              >
                ×2
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="quickBet(10)"
              >
                ×10
              </v-btn>
              <v-spacer />
              <v-btn
                size="small"
                variant="tonal"
                @click="amount = 1"
              >
                мин
              </v-btn>
            </div>

            <div class="text-body-medium font-weight-bold mb-2">
              Ряды
            </div>
            <v-btn-toggle
              :model-value="rows"
              color="primary"
              variant="tonal"
              divided
              class="mb-4"
              @update:model-value="(value) => setRows(value === 8 ? 8 : 16)"
            >
              <v-btn :value="8">
                8 рядов
              </v-btn>
              <v-btn :value="16">
                16 рядов
              </v-btn>
            </v-btn-toggle>

            <v-btn
              color="primary"
              size="large"
              block
              prepend-icon="sports_volleyball"
              :disabled="balls.length >= 10"
              @click="play"
            >
              {{ balls.length > 0 ? `Бросить ещё (в полёте: ${balls.length})` : 'Бросить мяч' }}
            </v-btn>

            <div
              v-if="history.length > 0"
              class="mt-5"
            >
              <div class="text-body-medium font-weight-bold mb-2">
                Последние броски
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
                    <v-avatar
                      :color="item.profit >= 0 ? 'success' : 'error'"
                      size="26"
                    >
                      <v-icon
                        :icon="item.profit >= 0 ? 'arrow_upward' : 'arrow_downward'"
                        size="16"
                      />
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-body-small">
                    {{ item.profit >= 0 ? `+${item.win}` : `−${Math.abs(item.profit)}` }} МР ·
                    ×{{ item.multiplier }} · {{ item.rows }} рядов
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
.plinko-board {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
}

.plinko-canvas {
  display: block;
  width: 100%;
  height: auto;
}
</style>
