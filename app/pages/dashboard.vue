<script setup lang="ts">
import { getLevelInfo } from '~~/utils/levels'

definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

const { data: session } = await useAsyncData('dashboard-session', () =>
  $fetch<{ user?: { name?: string, email?: string, balance?: number, xp?: number, lastCheckin?: number | null } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

const balance = ref(session.value?.user?.balance ?? 67)
const xp = ref(session.value?.user?.xp ?? 0)
const firstName = computed(() => session.value?.user?.name ?? 'клиент')

const levelInfo = computed(() => getLevelInfo(xp.value))

const { data: cardsData } = await useFetch('/api/cards')
const cards = ref<{ id: string, name: string, tier: string, last4: string, color: string, balance: number, createdAt: number }[]>(cardsData.value?.cards ?? [])

const totalOnCards = computed(() => cards.value.reduce((sum, card) => sum + card.balance, 0))

const checkinBusy = ref(false)

const lastCheckin = ref<number | null>(session.value?.user?.lastCheckin ?? null)
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)
const checkedInToday = computed(() => !!lastCheckin.value && lastCheckin.value >= todayStart.getTime())

async function claimCheckin() {
  checkinBusy.value = true
  try {
    const result = await $fetch('/api/checkin', { method: 'POST' })
    xp.value = result.xp
    window.dispatchEvent(new CustomEvent('mannru-xp', { detail: result.xp }))
    lastCheckin.value = Date.now()
    snackbar.show(`+${result.gained} XP за отметку. Держитесь, деньги уже в воображении.`, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    checkinBusy.value = false
  }
}

const xpBuyAmount = ref<number | null>(null)
const xpBuyBusy = ref(false)

async function buyXp() {
  xpBuyBusy.value = true
  try {
    const response = await $fetch<{ balance: number, xp: number, gainedXp: number }>('/api/xp/buy', {
      method: 'POST',
      body: { amount: xpBuyAmount.value }
    })
    balance.value = response.balance
    xp.value = response.xp
    window.dispatchEvent(new CustomEvent('mannru-xp', { detail: response.xp }))
    snackbar.show(`+${response.gainedXp} XP за ${xpBuyAmount.value} МР.`, 'success')
    xpBuyAmount.value = null
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    xpBuyBusy.value = false
  }
}

const stats = computed(() => [
  { label: 'Версия счёта', value: '6.7.0' },
  { label: 'Карта', value: cards.value.length ? `•••• ${cards.value[0]!.last4}` : 'нет карты' },
  { label: 'Статус', value: 'в воображении' },
  { label: 'Ставка', value: '6.7%' }
])

const transactions = [
  { name: 'Начисление процентов', amount: '+6.7 МР', date: 'сегодня', icon: 'trending_up', color: 'success' },
  { name: 'Бонус за первую карту', amount: '+1000 МР', date: 'вчера', icon: 'add_card', color: 'success' },
  { name: 'Покупка воображения', amount: '−6.7 МР', date: 'позавчера', icon: 'shopping_cart', color: 'error' },
  { name: 'Штраф за веру в банк', amount: '−67 МР', date: 'в пятницу', icon: 'gavel', color: 'error' },
  { name: 'Кэшбэк 6.7%', amount: '+6.7 МР', date: 'на прошлой неделе', icon: 'redeem', color: 'success' }
]
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-8">
      <div>
        <div class="text-overline text-secondary">
          личный кабинет · версия 6.7.0
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          С возвращением, {{ firstName }}!
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          {{ session?.user.email }} · уровень {{ levelInfo.current.level }} · {{ levelInfo.current.title }}
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-btn
          :href="'/cards'"
          color="primary"
          prepend-icon="credit_card"
          @click.prevent="navigateTo('/cards')"
        >
          Мои карты
        </v-btn>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="download"
        >
          Выписка
        </v-btn>
      </div>
    </div>

    <v-row>
      <v-col
        cols="12"
        lg="5"
      >
        <v-card
          color="primary"
          class="pa-8 h-100 d-flex flex-column justify-space-between"
        >
          <div>
            <div class="text-overline">
              доступный баланс · Маннрубли
            </div>
            <div class="text-5xl font-weight-bold mt-2 mb-0">
              {{ Math.floor(balance) }}<small class="text-xl font-weight-medium">.00 МР</small>
            </div>
          </div>
          <div>
            <div class="d-flex justify-space-between align-center text-body-medium">
              <span>Кошелёк</span>
              <span class="font-weight-bold">{{ Math.floor(balance) }} МР</span>
            </div>
            <v-divider class="my-3" />
            <div class="d-flex justify-space-between align-center text-body-medium">
              <span>На картах</span>
              <span class="font-weight-bold">{{ totalOnCards }} МР</span>
            </div>
            <v-divider class="my-3" />
            <div class="d-flex justify-space-between align-center text-body-medium">
              <span>Следующая проверка</span>
              <span class="font-weight-bold">через 6.7 лет</span>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        lg="7"
      >
        <v-row>
          <v-col
            v-for="stat in stats"
            :key="stat.label"
            cols="6"
          >
            <v-card class="pa-6 h-100">
              <div class="text-body-small text-medium-emphasis">
                {{ stat.label }}
              </div>
              <div class="text-xl font-weight-bold mt-2">
                {{ stat.value }}
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="h-100">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Уровень {{ levelInfo.current.level }} · «{{ levelInfo.current.title }}»
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-progress-linear
              :model-value="levelInfo.progress"
              color="primary"
              height="10"
              rounded
            />
            <div class="d-flex justify-space-between text-body-small text-medium-emphasis mt-2 mb-4">
              <span>{{ Math.floor(xp) }} XP</span>
              <span v-if="levelInfo.next">
                до уровня {{ levelInfo.next.level }} ещё {{ Math.ceil(levelInfo.need) }} XP
              </span>
              <span v-else>максимальный уровень</span>
            </div>

            <v-btn
              color="secondary"
              variant="tonal"
              block
              prepend-icon="event_available"
              :loading="checkinBusy"
              :disabled="checkedInToday"
              @click="claimCheckin"
            >
              {{ checkedInToday ? 'Отмечено сегодня ✓' : 'Отметить день · +6.7 XP' }}
            </v-btn>

            <v-divider class="my-4" />

            <div class="text-body-medium font-weight-bold mb-1">
              Обменять МР на опыт
            </div>
            <div class="text-body-small text-medium-emphasis mb-3">
              Курс: 10 МР = 1 XP · кошелёк: {{ balance }} МР
            </div>
            <v-text-field
              v-model="xpBuyAmount"
              label="Сколько МР вложить"
              type="number"
              min="10"
              prepend-icon="school"
              hide-details
            />
            <v-btn
              color="primary"
              block
              class="mt-3"
              prepend-icon="auto_awesome"
              :loading="xpBuyBusy"
              :disabled="!xpBuyAmount || xpBuyAmount < 10"
              @click="buyXp"
            >
              Конвертировать в XP
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="6"
      >
        <v-card class="h-100 d-flex flex-column">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Карты
          </v-card-title>
          <v-divider />
          <v-card-text class="flex-grow-1">
            <div
              v-if="cards.length === 0"
              class="text-body-medium text-medium-emphasis text-center py-6"
            >
              Карт пока нет.<br>
              Создайте первую — и получите <span class="font-weight-bold">+1000 МР</span> на карту.
            </div>
            <div
              v-for="card in cards.slice(0, 2)"
              :key="card.id"
              class="d-flex align-center ga-3 mb-3"
            >
              <v-avatar
                :color="card.color"
                size="40"
                rounded="lg"
              >
                <v-icon icon="credit_card" />
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-body-medium font-weight-bold">
                  {{ card.name }}
                </div>
                <div class="text-body-small text-medium-emphasis font-mono">
                  •••• {{ card.last4 }}
                </div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <v-btn
              :href="'/cards'"
              color="primary"
              variant="tonal"
              block
              prepend-icon="credit_card"
              @click.prevent="navigateTo('/cards')"
            >
              Управлять картами
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Последние операции
          </v-card-title>
          <v-divider />
          <v-list class="py-0">
            <v-list-item
              v-for="(item, index) in transactions"
              :key="index"
              class="py-2"
            >
              <template #prepend>
                <v-avatar
                  color="surface-variant"
                  size="38"
                >
                  <v-icon
                    :icon="item.icon"
                    size="20"
                    :color="item.color"
                  />
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-medium font-weight-medium">
                {{ item.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-small">
                {{ item.date }}
              </v-list-item-subtitle>
              <template #append>
                <span
                  class="font-weight-bold text-body-medium"
                  :class="item.amount.startsWith('+') ? 'text-success' : 'text-error'"
                >
                  {{ item.amount }}
                </span>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
