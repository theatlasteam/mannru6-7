<script setup lang="ts">
const { isDark, toggle } = useMannruTheme()
const drawer = ref(false)

const navItems = [
  { label: 'Продукты', href: '#products' },
  { label: 'Тарифы', href: '#rates' },
  { label: 'История', href: '#history' },
  { label: 'FAQ', href: '#faq' }
]
</script>

<template>
  <v-layout class="min-h-screen">
    <v-app-bar
      color="primary"
      elevation="4"
    >
      <v-container class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          class="d-md-none mr-2"
          aria-label="Открыть меню"
          @click="drawer = !drawer"
        >
          <v-icon icon="menu" />
        </v-btn>

        <NuxtLink
          to="/"
          class="d-flex align-center ga-3 text-decoration-none"
        >
          <img
            src="/logo.svg"
            alt="Маннру 6.7"
            class="md2-brand__logo"
          >
          <span class="text-title-large font-weight-bold">МАННРУ</span>
          <v-chip
            color="secondary"
            size="x-small"
          >6.7</v-chip>
        </NuxtLink>

        <v-spacer />

        <nav class="d-none d-md-flex ga-1 mr-3">
          <v-btn
            v-for="item in navItems"
            :key="item.href"
            :href="item.href"
            variant="text"
            size="small"
          >
            {{ item.label }}
          </v-btn>
        </nav>

        <v-btn
          icon
          variant="text"
          :aria-label="isDark ? 'Светлая тема' : 'Тёмная тема'"
          @click="toggle"
        >
          <v-icon :icon="isDark ? 'light_mode' : 'dark_mode'" />
        </v-btn>
        <v-btn
          :href="'/login'"
          color="on-primary"
          class="ml-2"
          size="small"
          @click.prevent="navigateTo('/login')"
        >
          Открыть счёт
        </v-btn>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      temporary
    >
      <v-list nav>
        <v-list-item
          title="Маннру 6.7"
          subtitle="Банк после пяти предыдущих"
          class="mb-3"
        >
          <template #prepend>
            <v-avatar>
              <img
                src="/logo.svg"
                alt="Маннру 6.7"
              >
            </v-avatar>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item
          v-for="item in navItems"
          :key="item.href"
          :title="item.label"
          :href="item.href"
          @click="drawer = false"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <NuxtPage />
    </v-main>
  </v-layout>
</template>
