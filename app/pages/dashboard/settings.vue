<script setup lang="ts">
import { signOut } from '~/utils/auth'

definePageMeta({
  layout: 'dashboard'
})

const { data: session } = await useAsyncData('settings-session', () =>
  $fetch<{ user?: { name?: string, email?: string, balance?: number, xp?: number } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

const { isDark, toggle } = useMannruTheme()

async function logout() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="mb-8">
      <div class="text-overline text-secondary">
        настройки
      </div>
      <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
        Настройки
      </h1>
      <p class="text-body-medium text-medium-emphasis mb-0">
        Версия 6.7.0 · предыдущие версии: 1, 2, 3, 4, 5
      </p>
    </div>

    <v-row>
      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Внешний вид
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div class="d-flex justify-space-between align-center ga-4">
              <div>
                <div class="text-body-medium font-weight-bold">
                  Тёмная тема
                </div>
                <p class="text-body-small text-medium-emphasis mb-0">
                  Для тех, кто открывает счёт ночью.
                </p>
              </div>
              <v-switch
                :model-value="isDark"
                color="primary"
                inset
                hide-details
                @update:model-value="toggle"
              />
            </div>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            О приложении
          </v-card-title>
          <v-divider />
          <v-list class="py-0">
            <v-list-item>
              <v-list-item-title class="text-body-medium font-weight-medium">
                Версия
              </v-list-item-title>
              <template #append>
                <span class="text-body-medium text-medium-emphasis">6.7.0</span>
              </template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-body-medium font-weight-medium">
                Лицензия
              </v-list-item-title>
              <template #append>
                <span class="text-body-medium text-medium-emphasis">№ 67-6-7</span>
              </template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-body-medium font-weight-medium">
                Статус
              </v-list-item-title>
              <template #append>
                <span class="text-body-medium text-success">работает в воображении</span>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Аккаунт
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div class="d-flex align-center ga-4 mb-6">
              <v-avatar
                color="primary"
                size="56"
                class="text-title-large font-weight-bold"
              >
                {{ session?.user.name?.[0]?.toUpperCase() ?? 'М' }}
              </v-avatar>
              <div>
                <div class="text-title-medium font-weight-bold">
                  {{ session?.user.name }}
                </div>
                <div class="text-body-medium text-medium-emphasis">
                  {{ session?.user.email }}
                </div>
              </div>
            </div>

            <div class="d-flex justify-space-between align-center text-body-medium mb-2">
              <span class="text-medium-emphasis">Баланс</span>
              <span class="font-weight-bold">{{ session?.user.balance ?? 67 }} МР</span>
            </div>
            <div class="d-flex justify-space-between align-center text-body-medium mb-2">
              <span class="text-medium-emphasis">Опыт</span>
              <span class="font-weight-bold">{{ Math.floor(session?.user.xp ?? 0) }} XP</span>
            </div>
            <div class="d-flex justify-space-between align-center text-body-medium mb-2">
              <span class="text-medium-emphasis">Валюта</span>
              <span class="font-weight-bold">Маннрубли (МР)</span>
            </div>
            <div class="d-flex justify-space-between align-center text-body-medium mb-2">
              <span class="text-medium-emphasis">Счёт</span>
              <span class="font-weight-bold">6.7.0</span>
            </div>
            <div class="d-flex justify-space-between align-center text-body-medium mb-2">
              <span class="text-medium-emphasis">Карта</span>
              <span class="font-weight-bold">•••• 0067</span>
            </div>

            <v-divider class="my-4" />

            <v-btn
              color="error"
              variant="tonal"
              block
              prepend-icon="logout"
              @click="logout"
            >
              Выйти из аккаунта
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Секретно
          </v-card-title>
          <v-divider />
          <v-card-text class="text-body-medium text-medium-emphasis">
            Кнопки «Печатать деньги» здесь нет. Она в разделе «Скоро».
            Раздел «Скоро» тоже не готов.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
