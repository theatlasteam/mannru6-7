<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const { data: session } = await useAsyncData('creepto-session', () =>
  $fetch<{ user?: { creepto?: number, clickPower?: number } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

const creepto = ref(session.value?.user?.creepto ?? 0)
const clickPower = ref(session.value?.user?.clickPower ?? 1)

const { data: cardsData } = await useFetch<{ cards: { id: string, name: string, balance: number, tier: string }[] }>('/api/cards')
const cards = ref(cardsData.value?.cards ?? [])

const selectedCard = ref<string | null>(cards.value[0]?.id ?? null)

const convertBusy = ref(false)
const upgradeBusy = ref(false)

const snackbar = useSnackbar()

const particles = ref<{ id: number, left: number, top: number, text: string }[]>([])
let particleId = 0

const upgradeCost = computed(() => clickPower.value * 100)

const { data: rateData } = await useFetch<{ rate: number, change: number }>('/api/creepto/rate')
const rate = ref(rateData.value?.rate ?? 67)
const rateChange = ref(rateData.value?.change ?? 0)

const convertable = computed(() => Math.floor(creepto.value / rate.value))

const LEVELS = ['Маннкоин 6.7', 'Маннкоин-мемель', 'Маннкоин-вкладчик', 'Маннкоин-олигарх', 'Маннкоин-император']
const clickTitle = computed(() => LEVELS[Math.min(clickPower.value - 1, LEVELS.length - 1)] ?? 'Маннкоин 6.7')

async function clickCoin(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const left = event.clientX - rect.left
  const top = event.clientY - rect.top
  const id = particleId++
  particles.value.push({ id, left, top, text: `+${clickPower.value}` })
  setTimeout(() => {
    particles.value = particles.value.filter(particle => particle.id !== id)
  }, 900)

  creepto.value += clickPower.value

  try {
    const response = await $fetch<{ creepto: number }>('/api/creepto/click', { method: 'POST' })
    creepto.value = response.creepto
  } catch {
    /* ignore */
  }
}

async function upgrade() {
  upgradeBusy.value = true
  try {
    const response = await $fetch<{ creepto: number, clickPower: number, cost: number }>('/api/creepto/upgrade', { method: 'POST' })
    creepto.value = response.creepto
    clickPower.value = response.clickPower
    snackbar.show(`Клик усилен до +${response.clickPower}. Следующий апгрейд — ${response.clickPower * 100} Маннкоин.`, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    upgradeBusy.value = false
  }
}

async function convert() {
  if (!selectedCard.value) {
    snackbar.show('Сначала выпустите карту', 'error')
    return
  }
  convertBusy.value = true
  try {
    const response = await $fetch<{ creepto: number, cardBalance: number, convertedMp: number, rate: number }>('/api/creepto/convert', {
      method: 'POST',
      body: { cardId: selectedCard.value }
    })
    creepto.value = response.creepto
    rate.value = response.rate
    const card = cards.value.find(item => item.id === selectedCard.value)
    if (card) {
      card.balance = response.cardBalance
    }
    snackbar.show(`Обменяно ${response.convertedMp} МР на карту. Курс: ${response.rate.toFixed(1)} Маннкоин = 1 МР.`, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    convertBusy.value = false
  }
}
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="mb-8">
      <div class="text-overline text-secondary">
        маннкоин-кликер
      </div>
      <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
        CoinClicker 6.7
      </h1>
      <p class="text-body-medium text-medium-emphasis mb-0">
        Майните Маннкоины, конвертируйте в карту. Опыт покупается на главной.
      </p>
    </div>

    <v-row>
      <v-col
        cols="12"
        lg="5"
      >
        <v-card class="h-100 text-center pa-6">
          <div class="text-h4 font-weight-bold">
            {{ Math.floor(creepto) }}
            <span class="text-h6 text-medium-emphasis">Маннкоин</span>
          </div>
          <div class="text-body-small text-medium-emphasis mb-6">
            клик +{{ clickPower }} · {{ clickTitle }}
          </div>

          <div class="coin-wrap">
            <div
              v-ripple
              class="coin"
              role="button"
              aria-label="Кликнуть монету"
              @click="clickCoin"
            >
              <span class="coin__mark">М</span>
            </div>
            <span
              v-for="particle in particles"
              :key="particle.id"
              class="coin__particle"
              :style="{ left: `${particle.left}px`, top: `${particle.top}px` }"
            >
              {{ particle.text }}
            </span>
          </div>

          <v-btn
            color="primary"
            block
            class="mt-6"
            prepend-icon="upgrade"
            :loading="upgradeBusy"
            :disabled="creepto < upgradeCost"
            @click="upgrade"
          >
            Улучшить клик · {{ upgradeCost }} Маннкоин
          </v-btn>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        lg="7"
      >
        <v-card class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Обменять на карту
          </v-card-title>
          <v-divider />
          <v-card-text>
            <p class="text-body-medium mb-4">
              Курс: <span class="font-weight-bold">{{ rate.toFixed(1) }} Маннкоин = 1 МР</span>
              <span
                class="font-weight-bold"
                :class="rateChange >= 0 ? 'text-success' : 'text-error'"
              >
                {{ rateChange >= 0 ? '▲' : '▼' }} {{ Math.abs(rateChange).toFixed(2) }} за час
              </span>
              · сейчас обмену подлежит {{ convertable }} МР
            </p>
            <v-select
              v-model="selectedCard"
              label="Карта"
              :items="cards.map(card => ({ title: `${card.name} · ${card.balance} МР`, value: card.id }))"
              prepend-icon="credit_card"
              class="mb-2"
            />
            <v-btn
              color="primary"
              block
              prepend-icon="swap_horiz"
              :loading="convertBusy"
              :disabled="!selectedCard || convertable <= 0"
              @click="convert"
            >
              Обменять всё ({{ convertable }} МР)
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.coin-wrap {
  position: relative;
  display: flex;
  width: 220px;
  height: 220px;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
}

.coin {
  display: flex;
  width: 170px;
  height: 170px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 6px solid rgb(var(--v-theme-on-primary));
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgb(var(--v-theme-primary)) 0%, color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, rgb(var(--v-theme-on-primary))) 100%);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.25), inset 0 -8px 18px rgba(0, 0, 0, 0.22), inset 0 8px 18px rgba(255, 255, 255, 0.35);
  transition: transform 80ms ease, box-shadow 80ms ease;
  user-select: none;
}

.coin:active {
  transform: scale(0.92);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25), inset 0 -4px 10px rgba(0, 0, 0, 0.22);
}

.coin__mark {
  font-size: 72px;
  font-weight: 900;
  color: rgb(var(--v-theme-on-primary));
  letter-spacing: -0.08em;
  pointer-events: none;
}

.coin__particle {
  position: absolute;
  font-weight: 800;
  color: rgb(var(--v-theme-secondary));
  animation: coin-float 900ms ease-out forwards;
  pointer-events: none;
}

@keyframes coin-float {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-70px) scale(1.25);
  }
}
</style>
