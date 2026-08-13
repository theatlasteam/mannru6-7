<script setup lang="ts">
import { signOut } from '~/utils/auth'
import { getLevelInfo } from '~~/utils/levels'

const route = useRoute()

const { isDark, toggle } = useMannruTheme()
const isMobile = useIsMobile()
const drawerOpen = ref(false)

/* на десктопе модель всегда «открыто» — панель постоянная,
 * на мобильном моделью управляет бургер */
const drawerModel = computed({
  get: () => isMobile.value ? drawerOpen.value : true,
  set: (value: boolean) => {
    if (isMobile.value) {
      drawerOpen.value = value
    }
  }
})

const navItems = [
  { title: 'Дашборд', to: '/dashboard', icon: 'space_dashboard' },
  { title: 'Карты', to: '/cards', icon: 'credit_card' },
  { title: 'Казино', to: '/gamble', icon: 'casino' },
  { title: 'Рулетка', to: '/roulette', icon: 'blur_circular' },
  { title: 'Плинко', to: '/plinko', icon: 'blur_on' },
  { title: 'Маннкоинкликер', to: '/creepto', icon: 'currency_bitcoin' },
  { title: 'Плагины', to: '/plugins', icon: 'extension' },
  { title: 'Документация', to: '/docs', icon: 'menu_book' },
  { title: 'Настройки', to: '/dashboard/settings', icon: 'settings' }
]

const xp = ref(0)

const { data: xpData } = await useAsyncData('layout-xp', () =>
  $fetch<{ user?: { xp?: number } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) }).then(result => result.user?.xp ?? 0)
)

const { data: layoutSession } = await useAsyncData('layout-session', () =>
  $fetch<{ user?: { id?: string } }>('/api/auth/get-session', { headers: useRequestHeaders(['cookie']) })
)

watch(xpData, (value) => {
  if (typeof value === 'number') {
    xp.value = value
  }
}, { immediate: true })

const levelInfo = computed(() => getLevelInfo(xp.value))

const { data: tabPluginsData, refresh: refreshTabPlugins } = await useFetch<{
  plugins: { id: string, name: string, type: string, icon: string }[]
}>('/api/plugins/gui')

const tabItems = computed(() => (tabPluginsData.value?.plugins ?? []).filter(plugin => plugin.type === 'tab'))

async function onPluginsChanged() {
  await refreshTabPlugins()
}

function onXpChange(event: Event) {
  const detail = (event as CustomEvent<number>).detail
  if (typeof detail === 'number') {
    xp.value = detail
  }
}

onMounted(async () => {
  /* слушатели регистрируются всегда — рефреш табов/виджетов не должен
   * зависеть от клиентской проверки сессии (она не готова к моменту хайдрации) */
  window.addEventListener('mannru-xp', onXpChange)
  window.addEventListener('mannru-plugins', onPluginsChanged)
  if (!layoutSession.value?.user) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
  }
})

onUnmounted(() => {
  window.removeEventListener('mannru-xp', onXpChange)
  window.removeEventListener('mannru-plugins', onPluginsChanged)
})

async function logout() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <v-layout class="min-h-screen">
    <v-app-bar
      v-if="isMobile"
      flat
      color="surface"
      class="mobile-bar"
    >
      <v-app-bar-nav-icon
        aria-label="Открыть меню"
        @click="drawerOpen = true"
      />
      <v-avatar
        size="30"
        class="mx-2"
      >
        <img
          src="/logo.svg"
          alt="Маннру 6.7"
        >
      </v-avatar>
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">
        Маннру 6.7
      </v-toolbar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawerModel"
      width="264"
      :permanent="!isMobile"
      :temporary="isMobile"
      :transition="false"
      class="dashboard-drawer"
    >
      <div class="d-flex align-center ga-3 px-4 py-5">
        <img
          src="/logo.svg"
          alt="Маннру 6.7"
          class="md2-brand__logo"
        >
        <div>
          <div class="text-body-medium font-weight-bold">
            Маннру 6.7
          </div>
          <div class="text-body-small text-medium-emphasis">
            личный кабинет
          </div>
        </div>
      </div>

      <v-divider class="mx-4" />

      <v-list
        nav
        class="pa-3"
      >
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :href="item.to"
          :active="route.path === item.to"
          :title="item.title"
          :prepend-icon="item.icon"
          rounded="lg"
          class="mb-1"
          @click.prevent="navigateTo(item.to)"
        />
      </v-list>

      <template v-if="tabItems.length > 0">
        <v-divider class="mx-4" />
        <div class="text-body-small font-weight-bold text-uppercase px-4 py-2">
          плагины
        </div>
        <v-list
          nav
          class="pa-3 pt-0"
        >
          <v-list-item
            v-for="item in tabItems"
            :key="item.id"
            :href="`/plugin/${item.id}`"
            :active="route.path === `/plugin/${item.id}`"
            :title="item.name"
            :prepend-icon="item.icon || 'extension'"
            rounded="lg"
            class="mb-1"
            @click.prevent="navigateTo(`/plugin/${item.id}`)"
          />
        </v-list>
      </template>

      <v-divider class="mx-4" />

      <div class="px-4 py-4">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-body-small font-weight-bold">Уровень {{ levelInfo.current.level }}</span>
          <span class="text-body-small text-medium-emphasis">{{ Math.floor(xp) }} XP</span>
        </div>
        <div class="text-body-small text-medium-emphasis mb-2">
          {{ levelInfo.current.title }}
        </div>
        <v-progress-linear
          :model-value="levelInfo.progress"
          color="primary"
          height="8"
          rounded
        />
        <div
          v-if="levelInfo.next"
          class="text-body-small text-medium-emphasis mt-2"
        >
          до «{{ levelInfo.next.title }}» ещё {{ Math.ceil(levelInfo.need) }} XP
        </div>
      </div>

      <template #append>
        <div class="d-flex flex-column ga-2 pa-4">
          <v-btn
            variant="tonal"
            block
            :prepend-icon="isDark ? 'light_mode' : 'dark_mode'"
            @click="toggle"
          >
            {{ isDark ? 'Светлая тема' : 'Тёмная тема' }}
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            block
            prepend-icon="logout"
            @click="logout"
          >
            Выйти
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main
      class="dashboard-main"
      :class="{ 'dashboard-main--mobile': isMobile }"
    >
      <NuxtPage />
    </v-main>

    <PluginWindows />
  </v-layout>
</template>
