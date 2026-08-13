<script setup lang="ts">
import { CARD_TIERS, getCardTier, isTierUnlocked } from '~~/utils/levels'
import { formatCardNumber } from '~~/utils/cardnumber'
import { getCardBehavior } from '~~/utils/behaviors'

definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

const { data: session } = await useAsyncData('cards-session', () =>
  $fetch<{ user?: { xp?: number, balance?: number } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

const xp = ref(session.value?.user?.xp ?? 0)
const balance = ref(session.value?.user?.balance ?? 67)

const { data: cardsData } = await useFetch<{ cards: CardItem[] }>('/api/cards')
const cards = ref<CardItem[]>(cardsData.value?.cards ?? [])

const dialogOpen = ref(false)
const busy = ref(false)
const cardName = ref('')
const selectedTier = ref<string>('tier1')

const deleteTarget = ref<{ id: string, name: string } | null>(null)
const deleteBusy = ref(false)

const transferTarget = ref<{ id: string, name: string, direction: 'to-card' | 'to-wallet' } | null>(null)
const transferAmount = ref<number | null>(null)
const transferBusy = ref(false)

const mutateTarget = ref<{ id: string, name: string } | null>(null)
const mutateName = ref('')
const mutateBusy = ref(false)

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

const detailTarget = ref<CardItem | null>(null)

const previewTier = ref<string | null>(null)

const previewTierInfo = computed(() => previewTier.value ? getCardTier(previewTier.value) : null)

const previewTierCards = computed(() => previewTier.value ? cards.value.filter(card => card.tier === previewTier.value) : [])

function openTierPreview(tierKey: string) {
  previewTier.value = tierKey
}

function sampleNumber(tierKey: string) {
  const level = CARD_TIERS.findIndex(tier => tier.key === tierKey) + 1
  return formatCardNumber(`67${String(level).padStart(2, '0')}676767670067`)
}

function openCreateFor(tierKey: string) {
  if (!unlocked(tierKey)) {
    return
  }
  cardName.value = ''
  selectedTier.value = tierKey
  dialogOpen.value = true
}

function openCardFromPreview(card: CardItem) {
  detailTarget.value = card
  previewTier.value = null
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function tierOf(card: { tier: string }) {
  return getCardTier(card.tier)
}

const ownedCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const card of cards.value) {
    counts[card.tier] = (counts[card.tier] ?? 0) + 1
  }
  return counts
})

async function deleteCard() {
  if (!deleteTarget.value) {
    return
  }
  deleteBusy.value = true
  try {
    await $fetch(`/api/cards/${deleteTarget.value.id}`, { method: 'DELETE' })
    cards.value = cards.value.filter(card => card.id !== deleteTarget.value?.id)
    deleteTarget.value = null
    snackbar.show('Карта уничтожена в воображении.', 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
    deleteTarget.value = null
  } finally {
    deleteBusy.value = false
  }
}

function openTransfer(card: { id: string, name: string }, direction: 'to-card' | 'to-wallet') {
  transferTarget.value = { id: card.id, name: card.name, direction }
  transferAmount.value = null
}

async function submitTransfer() {
  if (!transferTarget.value) {
    return
  }
  transferBusy.value = true
  try {
    const response = await $fetch<{ wallet: number, cardBalance: number, bonus: number, creepto: number }>(`/api/cards/${transferTarget.value.id}/transfer`, {
      method: 'POST',
      body: { amount: transferAmount.value, direction: transferTarget.value.direction }
    })
    const card = cards.value.find(item => item.id === transferTarget.value?.id)
    if (card) {
      card.balance = response.cardBalance
    }
    balance.value = response.wallet
    transferTarget.value = null

    let text = `Переведено ${transferAmount.value} МР.`
    if (response.bonus > 0) {
      text += ` +${response.bonus} МР сверху — карта Жадная или Щедрая!`
    }
    if (response.creepto > 0) {
      text += ' +1 Маннкоин — карта Майнер!'
    }
    snackbar.show(text, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
    transferTarget.value = null
  } finally {
    transferBusy.value = false
  }
}

const totalOnCards = computed(() => cards.value.reduce((sum, card) => sum + card.balance, 0))

function openMutate(card: { id: string, name: string }) {
  mutateTarget.value = { id: card.id, name: card.name }
  mutateName.value = card.name
}

async function submitMutate() {
  if (!mutateTarget.value) {
    return
  }
  mutateBusy.value = true
  try {
    const response = await $fetch<{ card: CardItem, tier: typeof CARD_TIERS[number], cost: number }>(`/api/cards/${mutateTarget.value.id}/mutate`, {
      method: 'POST',
      body: { name: mutateName.value }
    })
    const index = cards.value.findIndex(item => item.id === mutateTarget.value?.id)
    if (index !== -1) {
      cards.value[index] = response.card
    }
    mutateTarget.value = null
    let text = `Мутация прошла! Теперь это тир «${response.tier.name}» (мутация ×${response.card.mutations}).`
    if (response.cost === 0) {
      text += ' Бесплатно — карта Удачливая!'
    }
    snackbar.show(text, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
    mutateTarget.value = null
  } finally {
    mutateBusy.value = false
  }
}

function unlocked(tierKey: string) {
  return isTierUnlocked(xp.value, tierKey)
}

function pickTier(tierKey: string) {
  if (unlocked(tierKey)) {
    selectedTier.value = tierKey
  } else {
    const tier = getCardTier(tierKey)
    snackbar.show(`Тир «${tier.name}» откроется на ${tier.xp} XP. У вас ${Math.floor(xp.value)} XP.`, 'error')
  }
}

function openDialog() {
  cardName.value = ''
  selectedTier.value = 'tier1'
  dialogOpen.value = true
}

async function createCard() {
  busy.value = true
  try {
    const response = await $fetch<{ card: CardItem, balance: number, xp: number, bonus: number, cost: number, mutated: boolean, behavior: { name: string, desc: string }, leveledUp: { level: number, title: string } | null }>('/api/cards', {
      method: 'POST',
      body: { name: cardName.value, tier: selectedTier.value }
    })
    cards.value = [...cards.value, response.card]
    balance.value = response.balance
    xp.value = response.xp
    window.dispatchEvent(new CustomEvent('mannru-xp', { detail: response.xp }))

    let text = ''
    if (response.bonus > 0) {
      text = `Первая карта! +${response.bonus} МР и +50 XP — бонус уже на карте.`
    } else {
      text = `Карта выпущена за ${response.cost} МР. +50 XP.`
    }
    if (response.mutated) {
      text += ` Карта родилась МУТИРОВАННОЙ! Поведение: «${response.behavior.name}» — ${response.behavior.desc}`
    }
    if (response.leveledUp) {
      text += ` Новый уровень: «${response.leveledUp.title}»!`
    }
    snackbar.show(text, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    busy.value = false
  }
}

const selectedTierInfo = computed(() => getCardTier(selectedTier.value))
const isFirstCard = computed(() => cards.value.length === 0)
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-8">
      <div>
        <div class="text-overline text-secondary">
          карты
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          Карты Маннру
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          {{ cards.length }} карт · кошелёк {{ balance }} МР · на картах {{ totalOnCards }} МР · {{ Math.floor(xp) }} XP
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="add_card"
        @click="openDialog"
      >
        Создать карту
      </v-btn>
    </div>

    <v-row v-if="cards.length === 0">
      <v-col cols="12">
        <v-card class="pa-10 text-center">
          <v-icon
            icon="credit_card"
            size="56"
            class="mb-4"
          />
          <h2 class="text-xl font-weight-bold mb-2">
            У вас пока нет карт
          </h2>
          <p class="text-body-medium text-medium-emphasis mb-6">
            Создайте первую — и получите <span class="font-weight-bold">+1000 МР</span> на карту.
          </p>
          <v-btn
            color="primary"
            size="large"
            prepend-icon="add_card"
            @click="openDialog"
          >
            Создать первую карту
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col
        v-for="card in cards"
        :key="card.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card
          v-ripple
          :color="card.color"
          class="mannru-card pa-6 h-100 d-flex flex-column"
          :class="[
            `mannru-card--${tierOf(card).deco}`,
            `mannru-card--${card.behavior}`,
            { 'mannru-card--mutated': card.mutations > 0 }
          ]"
          @click="detailTarget = card"
        >
          <span
            class="mannru-card__emblem"
            aria-hidden="true"
          >
            {{ tierOf(card).emblem }}
          </span>

          <div class="d-flex justify-space-between align-start">
            <div>
              <div class="text-title-medium font-weight-bold">
                {{ card.name }}
              </div>
              <div class="text-body-small mannru-card__muted">
                МАННРУ · v6.7
              </div>
            </div>
            <div class="d-flex align-center ga-1">
              <v-chip
                v-if="card.mutations > 0"
                color="on-primary"
                size="x-small"
                prepend-icon="bolt"
              >
                ×{{ card.mutations }}
              </v-chip>
              <v-chip
                color="primary"
                size="small"
              >
                {{ tierOf(card).name }}
              </v-chip>
              <v-chip
                v-if="card.behavior !== 'normal'"
                color="on-primary"
                size="x-small"
                prepend-icon="bolt"
                :title="`Поведение: ${getCardBehavior(card.behavior).name} — ${getCardBehavior(card.behavior).desc}`"
              >
                {{ getCardBehavior(card.behavior).name }}
              </v-chip>
              <v-chip
                v-if="card.mutations > 0"
                color="on-primary"
                size="x-small"
                prepend-icon="currency_exchange"
                :title="`Кэшбек ${Math.min(card.mutations, 5)}% с проигрышей в казино`"
              >
                кэшбек {{ Math.min(card.mutations, 5) }}%
              </v-chip>
              <v-btn
                icon
                variant="text"
                size="x-small"
                color="on-primary"
                aria-label="Удалить карту"
                @click.stop="deleteTarget = { id: card.id, name: card.name }"
              >
                <v-icon icon="delete" />
              </v-btn>
            </div>
          </div>

          <div class="mannru-card__balance mt-6">
            <div class="text-body-small mannru-card__muted">
              баланс карты
            </div>
            <div class="text-h5 font-weight-bold">
              {{ card.balance }} МР
            </div>
          </div>

          <v-spacer />

          <div class="text-body-medium font-mono tracking-widest mannru-card__number">
            {{ formatCardNumber(card.number) }}
          </div>

          <div class="d-flex justify-space-between align-center mt-3">
            <div class="text-body-small mannru-card__muted">
              06/67 · {{ tierOf(card).name.toUpperCase() }}
            </div>
            <div class="d-flex align-center ga-1">
              <v-btn
                icon
                variant="text"
                size="small"
                color="primary"
                aria-label="Мутировать карту"
                @click.stop="openMutate(card)"
              >
                <v-icon icon="bolt" />
              </v-btn>
            </div>
          </div>

          <div class="d-flex ga-2 mt-2">
            <v-btn
              size="small"
              color="primary"
              prepend-icon="add"
              @click.stop="openTransfer(card, 'to-card')"
            >
              Пополнить
            </v-btn>
            <v-btn
              size="small"
              color="on-primary"
              variant="tonal"
              prepend-icon="remove"
              @click.stop="openTransfer(card, 'to-wallet')"
            >
              Снять
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-8">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Индекс карт
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-row>
          <v-col
            v-for="tier in CARD_TIERS"
            :key="tier.key"
            cols="6"
            sm="4"
          >
            <div
              v-ripple
              class="index-item pa-3"
              :class="{ 'index-item--locked': !unlocked(tier.key) }"
              @click="openTierPreview(tier.key)"
            >
              <v-avatar
                :color="tier.color"
                size="38"
                rounded="lg"
                class="font-weight-bold"
              >
                {{ tier.emblem }}
              </v-avatar>
              <div class="flex-grow-1 ml-3">
                <div class="text-body-medium font-weight-bold">
                  {{ tier.name }}
                </div>
                <div class="text-body-small text-medium-emphasis">
                  <template v-if="!unlocked(tier.key)">
                    нужно {{ tier.xp }} XP
                  </template>
                  <template v-else-if="(ownedCounts[tier.key] ?? 0) > 0">
                    собрано ×{{ ownedCounts[tier.key] }}
                  </template>
                  <template v-else>
                    доступно
                  </template>
                </div>
              </div>
              <v-icon
                v-if="(ownedCounts[tier.key] ?? 0) > 0"
                icon="check_circle"
                color="success"
              />
              <v-icon
                v-else-if="unlocked(tier.key)"
                icon="lock_open"
                class="text-medium-emphasis"
              />
              <v-icon
                v-else
                icon="lock"
                class="text-medium-emphasis"
              />
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-dialog
      v-model="dialogOpen"
      max-width="500"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Новая карта
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-text-field
            v-model="cardName"
            label="Название карты"
            placeholder="Например: Карта мечты"
            counter="24"
            maxlength="24"
            prepend-icon="edit"
            class="mb-4"
          />

          <div class="text-body-medium font-weight-bold mb-2">
            Тир
          </div>
          <div class="d-flex flex-column ga-2">
            <div
              v-for="tier in CARD_TIERS"
              :key="tier.key"
              class="tier-row"
              :class="{
                'tier-row--selected': selectedTier === tier.key && unlocked(tier.key),
                'tier-row--locked': !unlocked(tier.key)
              }"
              @click="pickTier(tier.key)"
            >
              <v-avatar
                :color="tier.color"
                size="34"
                rounded="lg"
              >
                <v-icon icon="credit_card" />
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-body-medium font-weight-bold">
                  {{ tier.name }}
                </div>
                <div class="text-body-small text-medium-emphasis">
                  {{ tier.badge }}
                  <template v-if="!unlocked(tier.key)">
                    · нужно {{ tier.xp }} XP
                  </template>
                </div>
              </div>
              <v-icon
                v-if="unlocked(tier.key)"
                :icon="selectedTier === tier.key ? 'radio_button_checked' : 'radio_button_unchecked'"
                :color="selectedTier === tier.key ? 'primary' : undefined"
              />
              <v-icon
                v-else
                icon="lock"
                class="text-medium-emphasis"
              />
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="px-4 pb-4">
          <div class="text-body-small text-medium-emphasis flex-grow-1">
            <template v-if="isFirstCard">
              Первая карта — <span class="font-weight-bold text-success">+1000 МР</span> на карту
            </template>
            <template v-else>
              Стоимость: 500 МР
            </template>
          </div>
          <v-btn
            variant="text"
            @click="dialogOpen = false"
          >
            Отмена
          </v-btn>
          <v-btn
            color="primary"
            :loading="busy"
            :disabled="!unlocked(selectedTier)"
            @click="createCard"
          >
            Выпустить {{ selectedTierInfo.name }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!deleteTarget"
      max-width="420"
      @update:model-value="(value) => { if (!value) deleteTarget = null }"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Удалить карту?
        </v-card-title>
        <v-divider />
        <v-card-text class="text-body-medium">
          Карта «{{ deleteTarget?.name }}» будет уничтожена в воображении.
          Без возврата. Без слёз.
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteTarget = null"
          >
            Отмена
          </v-btn>
          <v-btn
            color="error"
            :loading="deleteBusy"
            @click="deleteCard"
          >
            Удалить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!transferTarget"
      max-width="420"
      @update:model-value="(value) => { if (!value) transferTarget = null }"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ transferTarget?.direction === 'to-card' ? 'Пополнить карту' : 'Снять с карты' }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          <p class="text-body-medium mb-4">
            Карта «{{ transferTarget?.name }}»
            <template v-if="transferTarget?.direction === 'to-card'">
              · с кошелька на карту
            </template>
            <template v-else>
              · с карты в кошелёк
            </template>
          </p>
          <v-text-field
            v-model="transferAmount"
            label="Сумма, МР"
            type="number"
            min="1"
            prepend-icon="payments"
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="transferTarget = null"
          >
            Отмена
          </v-btn>
          <v-btn
            color="primary"
            :loading="transferBusy"
            :disabled="!transferAmount || transferAmount <= 0"
            @click="submitTransfer"
          >
            Перевести
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!mutateTarget"
      max-width="420"
      @update:model-value="(value) => { if (!value) mutateTarget = null }"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Мутировать карту
        </v-card-title>
        <v-divider />
        <v-card-text>
          <p class="text-body-medium mb-4">
            Карта «{{ mutateTarget?.name }}» будет пересобрана: новый номер и, возможно, новый тир среди открытых.
          </p>
          <v-text-field
            v-model="mutateName"
            label="Название карты"
            maxlength="24"
            counter="24"
            prepend-icon="edit"
            class="mb-2"
          />
          <p class="text-body-small text-medium-emphasis mb-0">
            Стоимость мутации — 300 МР с баланса карты.
          </p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="mutateTarget = null"
          >
            Отмена
          </v-btn>
          <v-btn
            color="primary"
            :loading="mutateBusy"
            prepend-icon="bolt"
            @click="submitMutate"
          >
            Мутировать
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!detailTarget"
      max-width="560"
      @update:model-value="(value) => { if (!value) detailTarget = null }"
    >
      <template v-if="detailTarget">
        <v-card>
          <v-card-text class="pa-6">
            <v-card
              :color="detailTarget.color"
              class="mannru-card pa-6"
              :class="[
                `mannru-card--${tierOf(detailTarget).deco}`,
                `mannru-card--${detailTarget.behavior}`,
                { 'mannru-card--mutated': detailTarget.mutations > 0 }
              ]"
            >
              <span
                class="mannru-card__emblem"
                aria-hidden="true"
              >
                {{ tierOf(detailTarget).emblem }}
              </span>

              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="text-title-large font-weight-bold">
                    {{ detailTarget.name }}
                  </div>
                  <div class="text-body-small mannru-card__muted">
                    МАННРУ · v6.7
                  </div>
                </div>
                <div class="d-flex align-center ga-1">
                  <v-chip
                    v-if="detailTarget.mutations > 0"
                    color="on-primary"
                    size="small"
                    prepend-icon="bolt"
                  >
                    ×{{ detailTarget.mutations }}
                  </v-chip>
                  <v-chip
                    color="primary"
                    size="small"
                  >
                    {{ tierOf(detailTarget).name }}
                  </v-chip>
                </div>
              </div>

              <div class="mannru-card__balance mt-8">
                <div class="text-body-small mannru-card__muted">
                  баланс карты
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ detailTarget.balance }} МР
                </div>
              </div>

              <div class="text-body-medium font-mono tracking-widest mannru-card__number mt-8">
                {{ formatCardNumber(detailTarget.number) }}
              </div>

              <div class="text-body-small mannru-card__muted mt-2">
                06/67 · {{ tierOf(detailTarget).name.toUpperCase() }} · {{ tierOf(detailTarget).badge.toUpperCase() }}
              </div>
            </v-card>

            <div class="d-flex justify-space-between align-center mt-5">
              <div class="text-body-medium font-weight-bold">
                История мутаций
              </div>
              <div class="text-body-small text-medium-emphasis">
                {{ detailTarget.mutations }} {{ detailTarget.mutations === 1 ? 'мутация' : 'мутаций' }}
              </div>
            </div>

            <div
              v-if="detailTarget.behavior !== 'normal'"
              class="d-flex align-center ga-2 mt-3 pa-3"
              style="border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 10px"
            >
              <v-icon
                icon="bolt"
                color="primary"
              />
              <div>
                <div class="text-body-medium font-weight-bold">
                  Поведение: {{ getCardBehavior(detailTarget.behavior).name }}
                </div>
                <div class="text-body-small text-medium-emphasis">
                  {{ getCardBehavior(detailTarget.behavior).desc }}
                </div>
              </div>
            </div>

            <v-timeline
              v-if="detailTarget.mutationLog.length > 0"
              density="compact"
              class="mt-3"
            >
              <v-timeline-item
                v-for="(entry, index) in detailTarget.mutationLog"
                :key="index"
                :dot-color="getCardTier(entry.to).color"
                size="small"
              >
                <div class="text-body-medium">
                  {{ getCardTier(entry.from).name }} → {{ getCardTier(entry.to).name }}
                </div>
                <div class="text-body-small text-medium-emphasis">
                  {{ formatDate(entry.at) }}
                </div>
              </v-timeline-item>
            </v-timeline>

            <p
              v-else
              class="text-body-small text-medium-emphasis mt-3 mb-0"
            >
              Чистая карта. Ни одной мутации — пока.
            </p>
          </v-card-text>

          <v-card-actions class="px-6 pb-6">
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="add"
              @click="openTransfer(detailTarget, 'to-card')"
            >
              Пополнить
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="remove"
              @click="openTransfer(detailTarget, 'to-wallet')"
            >
              Снять
            </v-btn>
            <v-spacer />
            <v-btn
              color="primary"
              prepend-icon="bolt"
              @click="openMutate(detailTarget)"
            >
              Мутировать
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </v-dialog>

    <v-dialog
      :model-value="!!previewTier"
      max-width="560"
      @update:model-value="(value) => { if (!value) previewTier = null }"
    >
      <template v-if="previewTierInfo && previewTier">
        <v-card>
          <v-card-text class="pa-6">
            <v-card
              :color="previewTierInfo.color"
              class="mannru-card pa-6"
              :class="`mannru-card--${previewTierInfo.deco}`"
            >
              <span
                class="mannru-card__emblem"
                aria-hidden="true"
              >
                {{ previewTierInfo.emblem }}
              </span>

              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="text-title-large font-weight-bold">
                    Тир «{{ previewTierInfo.name }}»
                  </div>
                  <div class="text-body-small mannru-card__muted">
                    МАННРУ · v6.7 · {{ previewTierInfo.badge.toUpperCase() }}
                  </div>
                </div>
                <v-chip
                  v-if="!unlocked(previewTier)"
                  color="on-primary"
                  size="small"
                  prepend-icon="lock"
                >
                  {{ previewTierInfo.xp }} XP
                </v-chip>
                <v-chip
                  v-else-if="(ownedCounts[previewTier] ?? 0) > 0"
                  color="on-primary"
                  size="small"
                  prepend-icon="check_circle"
                >
                  собрано ×{{ ownedCounts[previewTier] }}
                </v-chip>
                <v-chip
                  v-else
                  color="on-primary"
                  size="small"
                >
                  доступно
                </v-chip>
              </div>

              <div class="mannru-card__balance mt-8">
                <div class="text-body-small mannru-card__muted">
                  баланс карты
                </div>
                <div class="text-h4 font-weight-bold">
                  67 МР
                </div>
              </div>

              <div class="text-body-medium font-mono tracking-widest mannru-card__number mt-8">
                {{ sampleNumber(previewTier) }}
              </div>

              <div class="text-body-small mannru-card__muted mt-2">
                06/67 · {{ previewTierInfo.name.toUpperCase() }}
              </div>
            </v-card>

            <div
              v-if="previewTierCards.length > 0"
              class="mt-5"
            >
              <div class="text-body-medium font-weight-bold mb-2">
                Ваши карты этого тира
              </div>
              <v-list class="pa-0">
                <v-list-item
                  v-for="card in previewTierCards"
                  :key="card.id"
                  @click="openCardFromPreview(card)"
                >
                  <template #prepend>
                    <v-avatar
                      :color="card.color"
                      size="34"
                      rounded="lg"
                    >
                      {{ tierOf(card).emblem }}
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-body-medium font-weight-medium">
                    {{ card.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-body-small">
                    {{ card.balance }} МР
                    <template v-if="card.mutations > 0">
                      · мутаций ×{{ card.mutations }}
                    </template>
                  </v-list-item-subtitle>
                  <template #append>
                    <v-icon
                      icon="chevron_right"
                      class="text-medium-emphasis"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <p
              v-else
              class="text-body-small text-medium-emphasis mt-5 mb-0"
            >
              {{ unlocked(previewTier) ? 'Карт этого тира пока нет. Выпустите первую!' : `Тир откроется на ${previewTierInfo.xp} XP. У вас ${Math.floor(xp)} XP.` }}
            </p>
          </v-card-text>

          <v-card-actions class="px-6 pb-6">
            <v-spacer />
            <v-btn
              variant="text"
              @click="previewTier = null"
            >
              Закрыть
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="add_card"
              :disabled="!unlocked(previewTier)"
              @click="openCreateFor(previewTier)"
            >
              Выпустить этот тир
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.tier-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.tier-row--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary) / 0.08);
}

.tier-row--locked {
  cursor: not-allowed;
  opacity: 0.55;
}

/* ═══ card decorations per tier ═══ */
.mannru-card {
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.mannru-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18) !important;
}

.mannru-card::before {
  position: absolute;
  z-index: 1;
  top: -60%;
  left: -30%;
  width: 60%;
  height: 220%;
  content: '';
  pointer-events: none;
  background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.28) 45%, transparent 70%);
  transform: rotate(14deg);
}

/* ═══ card index ═══ */
.index-item {
  display: flex;
  height: 100%;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.index-item:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary) / 0.06);
}

.index-item--locked {
  opacity: 0.55;
}
</style>
