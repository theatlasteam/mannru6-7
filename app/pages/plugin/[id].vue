<script setup lang="ts">
import { createApp } from 'vue/dist/vue.esm-bundler.js'
import type { Component } from 'vue'
import { createVuetify } from 'vuetify'
import * as VuetifyComponents from 'vuetify/components'
import * as VuetifyDirectives from 'vuetify/directives'
import { md } from 'vuetify/iconsets/md'
import { runPluginClient } from '~/utils/plugin-run'
import { createPluginCtx } from '~/utils/plugin-ctx'
import { mannruThemes } from '~~/utils/vuetify-theme'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const snackbar = useSnackbar()
const theme = useTheme()

const id = computed(() => String(route.params.id ?? ''))

const { data: tabsData } = await useFetch<{
  plugins: { id: string, name: string, type: string, code: string }[]
  ctx: { rate: number, change: number, xp: number, name: string }
}>('/api/plugins/gui')

const plugin = computed(() => (tabsData.value?.plugins ?? []).find(item => item.type === 'tab' && item.id === id.value))

const mountEl = ref<HTMLElement>()

let app: ReturnType<typeof createApp> | null = null
let vuetifyInstance: ReturnType<typeof createVuetify> | null = null

function pluginCtx(pluginId: string, deps: string[]) {
  return createPluginCtx({
    base: {
      rate: tabsData.value?.ctx.rate ?? 67,
      change: tabsData.value?.ctx.change ?? 0,
      xp: tabsData.value?.ctx.xp ?? 0,
      name: tabsData.value?.ctx.name ?? '',
      route: route.path,
      theme: theme.global.name.value
    },
    pluginId,
    state: {},
    deps,
    setXp: (value) => {
      window.dispatchEvent(new CustomEvent('mannru-xp', { detail: value }))
    },
    showSnackbar: (message) => {
      snackbar.show(message, 'info')
    },
    setTheme: (name) => {
      theme.change(name as never)
    },
    navigate: (path) => {
      navigateTo(path)
    }
  })
}
function mountPlugin(pluginId: string) {
  const el = mountEl.value
  const current = tabsData.value?.plugins.find(item => item.id === pluginId)
  if (!el || !current) {
    return
  }

  app?.unmount()
  el.innerHTML = ''

  let parsed: ReturnType<typeof runPluginClient>
  try {
    parsed = runPluginClient(current.code)
  } catch {
    el.textContent = 'Сломанный плагин'
    return
  }

  const component = parsed.component ?? {}

  if (!component || typeof component !== 'object' || Object.keys(component).length === 0) {
    el.textContent = 'Плагин не определяет component (Vue-объект с template/data/methods)'
    return
  }

  vuetifyInstance ??= createVuetify({
    components: VuetifyComponents as never,
    directives: VuetifyDirectives as never,
    theme: {
      defaultTheme: 'mannruLight',
      themes: mannruThemes
    },
    icons: {
      defaultSet: 'md',
      sets: { md }
    }
  })
  vuetifyInstance.theme.change(theme.global.name.value as never)

  app = createApp(component as Component)
  app.use(vuetifyInstance)
  const ctx = pluginCtx(pluginId, parsed.manifest.dependencies)
  app.provide('ctx', ctx)
  app.config.globalProperties.$ctx = ctx
  if (ctx.charts) {
    app.config.globalProperties.$charts = ctx.charts
  }
  if (ctx.utils) {
    app.config.globalProperties.$utils = ctx.utils
  }
  app.mount(el)
}

/* плагин-приложение следует за темой основного приложения */
watch(() => theme.global.name.value, (name) => {
  if (vuetifyInstance) {
    vuetifyInstance.theme.change(name as never)
  }
})

watch(plugin, (value) => {
  if (value) {
    mountPlugin(value.id)
  }
})

onMounted(() => {
  if (plugin.value) {
    mountPlugin(plugin.value.id)
  }
})

onUnmounted(() => {
  app?.unmount()
  app = null
})
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div
      v-if="!plugin"
      class="text-center py-10"
    >
      <v-icon
        icon="extension_off"
        size="48"
        class="mb-3"
      />
      <p class="text-body-medium text-medium-emphasis mb-0">
        Плагин не найден или выключен.
      </p>
    </div>
    <div
      v-else
      ref="mountEl"
    />
  </v-container>
</template>
