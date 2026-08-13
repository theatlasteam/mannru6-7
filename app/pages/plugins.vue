<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

const { data: pluginsData } = await useFetch<{ plugins: PluginItem[] }>('/api/plugins')
const plugins = ref<PluginItem[]>(pluginsData.value?.plugins ?? [])

const { data: marketplaceData } = await useFetch<{ plugins: MarketplaceItem[] }>('/api/plugins/marketplace')
const marketplace = ref<MarketplaceItem[]>(marketplaceData.value?.plugins ?? [])

type PluginItem = {
  id: string
  name: string
  desc: string
  version: string
  type: string
  code: string
  active: number
  isPublic: number
  createdAt: number
}

type MarketplaceItem = {
  id: string
  name: string
  desc: string
  version: string
  type: string
  author: string
}

const ACTION_TEMPLATE = `const manifest = {
  name: 'Мой плагин',
  desc: 'Просто плагин',
  version: '1.0'
}

const hooks = {
  run(ctx) {
    return 'Запущено. Курс: ' + ctx.rate.toFixed(1) + ' Маннкоин = 1 МР'
  }
}`

const GUI_TEMPLATE = `const manifest = {
  name: 'Мой виджет',
  desc: 'Плавающее окно',
  version: '1.0',
  type: 'gui'
}

const hooks = {
  render(ctx) {
    const count = ctx.state.count || 0
    return '<b>Счёт: ' + count + '</b> (из JSON-БД)<br>' +
      '<button data-plugin-action="click">' +
        '<i class="material-icons">add</i> +1' +
      '</button> ' +
      '<button data-plugin-action="theme" data-variant="tonal" data-size="small">' +
        '<i class="material-icons">palette</i> Тема' +
      '</button>'
  },
  async onInit(ctx) {
    const count = await ctx.db.get('count')
    if (typeof count === 'number') {
      ctx.state.count = count
    }
  },
  async onAction(action, fields, ctx) {
    if (action === 'click') {
      const prev = (await ctx.db.get('count')) || 0
      ctx.state.count = prev + 1
      await ctx.db.set('count', ctx.state.count)
      return { message: 'Теперь ' + ctx.state.count }
    }
    if (action === 'theme') {
      ctx.toggleTheme()
      return { message: ctx.theme === 'mannruDark' ? 'Светлая тема' : 'Тёмная тема' }
    }
  },
  run(ctx) {
    return 'Курс: ' + ctx.rate.toFixed(1) + ' Маннкоин = 1 МР'
  }
}`

const TAB_TEMPLATE = `const manifest = {
  name: 'Мой таб',
  desc: 'Вкладка с настоящим Vue',
  version: '1.0',
  type: 'tab',
  dependencies: ['creepto']
}

const component = {
  data() {
    return { count: 0, rate: 0 }
  },
  async mounted() {
    const data = await this.$ctx.creepto.rate()
    this.rate = data ? data.rate : 0
  },
  template: \`
    <v-card class="pa-6">
      <v-btn color="primary" prepend-icon="add" @click="count++">
        Нажато {{ count }}
      </v-btn>
      <v-divider class="my-4" />
      <div>Курс Маннкоина: {{ rate ? rate.toFixed(1) : '...' }}</div>
    </v-card>
  \`
}`

const editorOpen = ref(false)
const code = ref(ACTION_TEMPLATE)
const busy = ref(false)
const isPublic = ref(false)
const testResult = ref<{ manifest?: { name: string, desc: string, version: string, type: string }, hooks?: string[] } | null>(null)

/* ═══ ИИ-генератор ═══ */
const aiOpen = ref(false)
const aiType = ref<'action' | 'gui' | 'tab'>('tab')
const aiPrompt = ref('')
const aiBusy = ref(false)
const aiResult = ref<{ code: string, manifest?: { name: string, type: string } | null, hooks?: string[] } | null>(null)

const AI_EXAMPLES: Record<string, string> = {
  tab: 'Вкладка с графиком курса Маннкоина: свечи из /api/creepto/rate (ohlc/history) через ctx.charts, кнопка обновления и полноэкранный v-overlay с крупным графиком',
  gui: 'Виджет курса Маннкоина: текущий курс, изменение за час и кнопка обновления через fetchJson',
  action: 'Хук, который возвращает приветствие с курсом Маннкоина и форматом денег через utils'
}

function openAi() {
  aiOpen.value = true
  aiResult.value = null
  aiPrompt.value = AI_EXAMPLES[aiType.value] ?? ''
}

function setAiType(type: 'action' | 'gui' | 'tab') {
  aiType.value = type
  aiPrompt.value = AI_EXAMPLES[type] ?? ''
}

async function generatePlugin() {
  if (!aiPrompt.value.trim()) {
    snackbar.show('Опишите, что должен делать плагин', 'error')
    return
  }
  aiBusy.value = true
  aiResult.value = null
  try {
    aiResult.value = await $fetch<{ code: string, manifest?: { name: string, type: string } | null, hooks?: string[] }>('/api/plugins/generate', {
      method: 'POST',
      body: { type: aiType.value, prompt: aiPrompt.value }
    })
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    aiBusy.value = false
  }
}

function useAiCode() {
  if (aiResult.value?.code) {
    code.value = aiResult.value.code
    testResult.value = null
    aiOpen.value = false
    editorOpen.value = true
    snackbar.show('Сгенерированный код вставлен в редактор', 'success')
  }
}

const fileInput = ref<HTMLInputElement>()

function openEditor() {
  code.value = ACTION_TEMPLATE
  isPublic.value = false
  testResult.value = null
  editorOpen.value = true
}

function loadTemplate(template: string) {
  code.value = template
  testResult.value = null
}

function editPlugin(plugin: PluginItem) {
  code.value = plugin.code
  isPublic.value = !!plugin.isPublic
  testResult.value = null
  editorOpen.value = true
}

async function launchPlugin(id: string) {
  try {
    const response = await $fetch<{ output: string }>(`/api/plugins/${id}/run`, { method: 'POST' })
    const output = response.output.length > 200 ? `${response.output.slice(0, 200)}…` : response.output
    snackbar.show(output, 'success')
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  }
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    code.value = String(reader.result ?? '')
    testResult.value = null
    snackbar.show(`Загружен файл ${file.name}`, 'info')
  }
  reader.readAsText(file)
  input.value = ''
}

async function testPlugin() {
  busy.value = true
  testResult.value = null
  try {
    testResult.value = await $fetch('/api/plugins/test', {
      method: 'POST',
      body: { code: code.value }
    })
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

async function publish() {
  busy.value = true
  try {
    const response = await $fetch<{ plugin: PluginItem, hooks: string[] }>('/api/plugins', {
      method: 'POST',
      body: { code: code.value, isPublic: isPublic.value }
    })
    plugins.value = [response.plugin, ...plugins.value]
    if (response.plugin.isPublic) {
      marketplace.value = [{ id: response.plugin.id, name: response.plugin.name, desc: response.plugin.desc, version: response.plugin.version, type: response.plugin.type, author: 'вы' }, ...marketplace.value]
    }
    editorOpen.value = false
    snackbar.show(
      `Плагин «${response.plugin.name}» опубликован. Хуки: ${response.hooks.join(', ')}`
      + (response.plugin.isPublic ? '. Виден всем.' : '. Только вы видите его.'),
      'success'
    )
    window.dispatchEvent(new CustomEvent('mannru-plugins'))
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

const installBusyId = ref<string | null>(null)
const installedIds = ref<Set<string>>(new Set())

async function installPlugin(plugin: MarketplaceItem) {
  installBusyId.value = plugin.id
  try {
    const response = await $fetch<{ plugin: PluginItem }>(`/api/plugins/${plugin.id}/install`, { method: 'POST' })
    plugins.value = [response.plugin, ...plugins.value]
    installedIds.value = new Set(installedIds.value).add(plugin.id)
    snackbar.show(
      plugin.type === 'tab'
        ? `Плагин «${plugin.name}» установлен — вкладка появилась в боковой панели`
        : `Плагин «${plugin.name}» установлен — виджет включён`,
      'success'
    )
    window.dispatchEvent(new CustomEvent('mannru-plugins'))
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  } finally {
    installBusyId.value = null
  }
}

async function toggle(plugin: PluginItem) {
  try {
    const response = await $fetch<{ active: number }>(`/api/plugins/${plugin.id}/toggle`, { method: 'POST' })
    plugin.active = response.active
    snackbar.show(response.active ? `Плагин «${plugin.name}» активирован` : `Плагин «${plugin.name}» отключён`, 'success')
    window.dispatchEvent(new CustomEvent('mannru-plugins'))
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  }
}

async function remove(plugin: PluginItem) {
  try {
    await $fetch(`/api/plugins/${plugin.id}`, { method: 'DELETE' })
    plugins.value = plugins.value.filter(item => item.id !== plugin.id)
    snackbar.show(`Плагин «${plugin.name}» удалён`, 'success')
    window.dispatchEvent(new CustomEvent('mannru-plugins'))
  } catch (error) {
    snackbar.show(
      error instanceof Error && 'data' in error
        ? String((error as { data: { statusMessage?: string } }).data?.statusMessage ?? 'Ошибка')
        : 'Ошибка',
      'error'
    )
  }
}
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-8">
      <div>
        <div class="text-overline text-secondary">
          плагины
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          Плагины Маннру
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          Пишите код, публикуйте, активируйте. GUI-плагины открываются плавающими окнами, action-плагины влияют на работу банка.
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="add"
        @click="openEditor"
      >
        Новый плагин
      </v-btn>
      <v-btn
        variant="tonal"
        prepend-icon="auto_awesome"
        @click="openAi"
      >
        Генератор ИИ
      </v-btn>
      <v-btn
        variant="tonal"
        prepend-icon="menu_book"
        @click="navigateTo('/docs')"
      >
        Документация
      </v-btn>
    </div>

    <v-card class="mb-6">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Как это работает
      </v-card-title>
      <v-divider />
      <v-card-text class="text-body-medium">
        Плагин — это JS-код с объектами <span class="font-mono font-weight-bold">manifest</span> и
        <span class="font-mono font-weight-bold">hooks</span>. GUI-плагины рисуют плавающие окна:
        с кнопками (<span class="font-mono font-weight-bold">data-plugin-action</span>), полями
        (<span class="font-mono font-weight-bold">data-field</span>) и иконками
        (<span class="font-mono font-weight-bold">material-icons</span>). Кнопка «Запустить» вызывает хук
        <span class="font-mono font-weight-bold">run(ctx)</span>. Ошибки в плагине банк проглатывает.
      </v-card-text>
    </v-card>

    <div
      v-if="plugins.length === 0"
      class="text-body-medium text-medium-emphasis text-center py-10"
    >
      Плагинов пока нет. Напишите первый!
    </div>

    <v-row v-else>
      <v-col
        v-for="plugin in plugins"
        :key="plugin.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card class="h-100 d-flex flex-column">
          <v-card-item>
            <template #prepend>
              <v-avatar
                color="primary"
                rounded="lg"
              >
                <v-icon icon="extension" />
              </v-avatar>
            </template>
            <v-card-title class="text-body-medium font-weight-bold">
              {{ plugin.name }}
            </v-card-title>
            <v-card-subtitle class="text-body-small">
              v{{ plugin.version }} ·
              <span v-if="plugin.isPublic">публичный</span>
              <span v-else>приватный</span>
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="flex-grow-1">
            <div class="d-flex ga-1 mb-2">
              <v-chip
                v-if="plugin.type === 'gui'"
                size="x-small"
                color="primary"
              >
                GUI-виджет
              </v-chip>
              <v-chip
                v-else-if="plugin.type === 'tab'"
                size="x-small"
                color="info"
              >
                таб-плагин
              </v-chip>
              <v-chip
                v-else
                size="x-small"
                color="secondary"
              >
                хук-плагин
              </v-chip>
              <v-chip
                size="x-small"
                color="medium-emphasis"
              >
                {{ plugin.active ? 'включён' : 'выключен' }}
              </v-chip>
            </div>
            <p class="text-body-small text-medium-emphasis mb-0">
              {{ plugin.desc || 'Без описания' }}
            </p>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn
              color="primary"
              size="small"
              prepend-icon="play_arrow"
              @click="launchPlugin(plugin.id)"
            >
              {{ plugin.type === 'gui' ? (plugin.active ? 'Перезапустить' : 'Запустить') : 'Запустить' }}
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              variant="text"
              size="small"
              aria-label="Редактировать"
              @click="editPlugin(plugin)"
            >
              <v-icon icon="edit" />
            </v-btn>
            <v-switch
              :model-value="!!plugin.active"
              color="primary"
              hide-details
              @update:model-value="toggle(plugin)"
            />
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              aria-label="Удалить"
              @click="remove(plugin)"
            >
              <v-icon icon="delete" />
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <div class="mt-10 mb-4">
      <h2 class="text-h5 font-weight-bold mb-1">
        Магазин плагинов
      </h2>
      <p class="text-body-medium text-medium-emphasis mb-0">
        Публичные плагины других клиентов. Приватные видите только вы.
      </p>
    </div>

    <div
      v-if="marketplace.length === 0"
      class="text-body-medium text-medium-emphasis text-center py-8"
    >
      Публичных плагинов пока нет. Опубликуйте свой как публичный!
    </div>

    <v-row v-else>
      <v-col
        v-for="plugin in marketplace"
        :key="plugin.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card class="h-100 d-flex flex-column">
          <v-card-item>
            <template #prepend>
              <v-avatar
                color="secondary"
                rounded="lg"
              >
                <v-icon icon="extension" />
              </v-avatar>
            </template>
            <v-card-title class="text-body-medium font-weight-bold">
              {{ plugin.name }}
            </v-card-title>
            <v-card-subtitle class="text-body-small">
              от {{ plugin.author }} · v{{ plugin.version }}
            </v-card-subtitle>
          </v-card-item>
          <v-card-text class="flex-grow-1">
            <v-chip
              v-if="plugin.type === 'gui'"
              size="x-small"
              color="primary"
              class="mb-2"
            >
              GUI-виджет
            </v-chip>
            <v-chip
              v-else-if="plugin.type === 'tab'"
              size="x-small"
              color="info"
              class="mb-2"
            >
              таб-плагин
            </v-chip>
            <v-chip
              v-else
              size="x-small"
              color="secondary"
              class="mb-2"
            >
              хук-плагин
            </v-chip>
            <p class="text-body-small text-medium-emphasis mb-0">
              {{ plugin.desc || 'Без описания' }}
            </p>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <v-btn
              v-if="plugin.type === 'action'"
              color="primary"
              size="small"
              prepend-icon="play_arrow"
              @click="launchPlugin(plugin.id)"
            >
              Запустить
            </v-btn>
            <v-btn
              v-else
              color="primary"
              size="small"
              prepend-icon="download"
              :loading="installBusyId === plugin.id"
              :disabled="installedIds.has(plugin.id)"
              @click="installPlugin(plugin)"
            >
              {{ installedIds.has(plugin.id) ? 'Установлено' : 'Установить' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog
      v-model="editorOpen"
      max-width="680"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Редактор плагина
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert
            v-if="testResult"
            type="success"
            variant="tonal"
            class="mb-3"
          >
            Манифест: «{{ testResult.manifest?.name }}» v{{ testResult.manifest?.version }}
            ({{ testResult.manifest?.type === 'gui' ? 'GUI, плавающее окно' : testResult.manifest?.type === 'tab' ? 'таб-плагин, Vue' : 'хук-плагин' }}) ·
            хуки: {{ testResult.hooks?.join(', ') || 'нет' }}
          </v-alert>

          <div class="d-flex ga-2 mb-2">
            <v-btn
              size="small"
              variant="tonal"
              @click="loadTemplate(ACTION_TEMPLATE)"
            >
              Шаблон: хук
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              @click="loadTemplate(GUI_TEMPLATE)"
            >
              Шаблон: GUI
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              @click="loadTemplate(TAB_TEMPLATE)"
            >
              Шаблон: таб
            </v-btn>
          </div>

          <textarea
            v-model="code"
            class="plugin-editor"
            spellcheck="false"
            rows="14"
            aria-label="Код плагина"
          />

          <v-switch
            v-model="isPublic"
            color="primary"
            label="Публичный плагин — его увидят все клиенты в магазине"
            inset
            hide-details
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <input
            ref="fileInput"
            type="file"
            accept=".js,.mjs,.txt"
            class="d-none"
            @change="onFilePicked"
          >
          <v-btn
            variant="tonal"
            prepend-icon="upload_file"
            @click="fileInput?.click()"
          >
            Загрузить из файла
          </v-btn>
          <v-spacer />
          <v-btn
            variant="text"
            @click="editorOpen = false"
          >
            Отмена
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="play_arrow"
            :loading="busy"
            @click="testPlugin"
          >
            Тест
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="rocket_launch"
            :loading="busy"
            @click="publish"
          >
            Опубликовать
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="aiOpen"
      max-width="760"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Генератор плагинов на ИИ
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div class="text-body-medium font-weight-bold mb-2">
            Тип плагина
          </div>
          <v-btn-toggle
            :model-value="aiType"
            color="primary"
            variant="tonal"
            divided
            class="mb-4"
            @update:model-value="(value) => setAiType(value as 'action' | 'gui' | 'tab')"
          >
            <v-btn value="action">
              Хук
            </v-btn>
            <v-btn value="gui">
              Виджет
            </v-btn>
            <v-btn value="tab">
              Вкладка
            </v-btn>
          </v-btn-toggle>

          <v-textarea
            v-model="aiPrompt"
            label="Опишите, что должен делать плагин"
            placeholder="Например: вкладка с графиком курса Маннкоина и полноэкранным уведомлением через v-overlay"
            rows="4"
            counter="2000"
            maxlength="2000"
            hide-details
            class="mb-2"
          />
          <p class="text-body-small text-medium-emphasis mb-0">
            ИИ знает API плагинов, контекст (ctx), библиотеки Charts и Mannru Utils, все компоненты
            Vuetify (включая полноэкранный v-overlay поверх всего интерфейса) и API банка.
          </p>

          <v-alert
            v-if="aiResult"
            :type="aiResult.code ? 'success' : 'error'"
            variant="tonal"
            class="mt-4"
          >
            <template v-if="aiResult.code">
              <div class="text-body-medium font-weight-bold">
                Готово: «{{ aiResult.manifest?.name ?? 'без названия' }}» ({{ aiResult.manifest?.type ?? '?' }})
                · хуки: {{ aiResult.hooks?.join(', ') || 'нет' }}
              </div>
              <div class="text-body-small text-medium-emphasis">
                Сгенерировано {{ aiResult.code.length }} символов кода.
              </div>
            </template>
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-btn
            variant="text"
            :disabled="aiBusy"
            @click="aiOpen = false"
          >
            Закрыть
          </v-btn>
          <v-spacer />
          <v-btn
            variant="tonal"
            prepend-icon="auto_awesome"
            :loading="aiBusy"
            :disabled="!aiPrompt.trim()"
            @click="generatePlugin"
          >
            Сгенерировать
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="playlist_add"
            :disabled="!aiResult?.code"
            @click="useAiCode"
          >
            Вставить в редактор
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


  </v-container>
</template>

<style scoped>
.plugin-editor {
  width: 100%;
  resize: vertical;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-variant));
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}

.plugin-editor:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
