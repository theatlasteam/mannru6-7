<script setup lang="ts">
import { runPluginClient } from '~/utils/plugin-run'
import { createPluginCtx } from '~/utils/plugin-ctx'

const snackbar = useSnackbar()
const route = useRoute()
const theme = useTheme()

type GuiWidget = {
  plugin: { id: string, name: string, type: string, code: string }
  html: string
  state: Record<string, unknown>
  pos: { x: number, y: number }
  deps: string[]
}

const { data: guiData, refresh: refreshGui } = await useFetch<{
  plugins: { id: string, name: string, type: string, code: string }[]
  ctx: { rate: number, change: number, xp: number, name: string }
}>('/api/plugins/gui')

const widgets = ref<GuiWidget[]>([])
const xp = ref(guiData.value?.ctx.xp ?? 0)

const dragging = ref<{ widget: GuiWidget, offsetX: number, offsetY: number } | null>(null)

function htmlOf(output: unknown) {
  if (typeof output === 'string') {
    return output
  }
  if (output && typeof output === 'object') {
    const { title, text } = output as { title?: string, text?: string }
    return `<b>${title ?? ''}</b> ${text ?? ''}`
  }
  return ''
}

function buildCtx(widget: GuiWidget) {
  return createPluginCtx({
    base: {
      rate: guiData.value?.ctx.rate ?? 67,
      change: guiData.value?.ctx.change ?? 0,
      xp: xp.value,
      name: guiData.value?.ctx.name ?? '',
      route: route.path,
      theme: theme.global.name.value
    },
    pluginId: widget.plugin.id,
    state: widget.state,
    deps: widget.deps,
    setXp: (value) => {
      xp.value = value
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

function renderWidget(widget: GuiWidget) {
  try {
    const { hooks } = runPluginClient(widget.plugin.code)
    const render = (hooks as Record<string, unknown>).render as ((ctx: Record<string, unknown>) => unknown) | undefined
    widget.html = htmlOf(render?.(buildCtx(widget)))
  } catch {
    widget.html = '<i>сломанный виджет</i>'
  }
}

async function initWidget(widget: GuiWidget) {
  renderWidget(widget)
  try {
    const { hooks } = runPluginClient(widget.plugin.code)
    const onInit = (hooks as Record<string, unknown>).onInit as ((ctx: Record<string, unknown>) => unknown) | undefined
    if (typeof onInit === 'function') {
      await onInit(buildCtx(widget))
      renderWidget(widget)
    }
  } catch {
    /* broken init ignored */
  }
}

function loadPos(pluginId: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`mannru-widget-${pluginId}`) ?? '')
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    /* ignore */
  }
  return null
}

function savePos(widget: GuiWidget) {
  try {
    localStorage.setItem(`mannru-widget-${widget.plugin.id}`, JSON.stringify(widget.pos))
  } catch {
    /* ignore */
  }
}

function buildWidgets() {
  widgets.value = (guiData.value?.plugins ?? [])
    .filter(plugin => plugin.type === 'gui')
    .map((plugin, index) => {
      const pos = loadPos(plugin.id) ?? { x: 24 + index * 36, y: 96 + index * 44 }
      let deps: string[] = []
      try {
        deps = runPluginClient(plugin.code).manifest.dependencies
      } catch {
        /* broken widget */
      }
      const widget: GuiWidget = { plugin, html: '', state: {}, pos, deps }
      initWidget(widget)
      return widget
    })
}

async function refresh() {
  await refreshGui()
  buildWidgets()
}

async function onWidgetAction(widget: GuiWidget, event: MouseEvent) {
  const target = (event.target as HTMLElement).closest('[data-plugin-action]')
  if (!target) {
    return
  }
  const action = target.getAttribute('data-plugin-action')
  const root = event.currentTarget as HTMLElement

  const fields: Record<string, string> = {}
  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((input) => {
    fields[input.getAttribute('data-field') ?? ''] = input.value
  })

  try {
    const { hooks } = runPluginClient(widget.plugin.code)
    const onAction = (hooks as Record<string, unknown>).onAction as ((action: string, fields: Record<string, string>, ctx: Record<string, unknown>) => unknown) | undefined
    if (typeof onAction === 'function') {
      const result = await onAction(action ?? '', fields, buildCtx(widget)) as { message?: string } | undefined
      if (result?.message) {
        snackbar.show(result.message, 'info')
      }
    }
  } catch {
    /* broken widget action ignored */
  }

  renderWidget(widget)
}

function closeWidget(widget: GuiWidget) {
  widgets.value = widgets.value.filter(item => item.plugin.id !== widget.plugin.id)
}

function spawnRipple(event: PointerEvent) {
  const button = (event.target as HTMLElement).closest('button')
  if (!button) {
    return
  }
  const windowEl = button.closest('.plugin-window') as HTMLElement | null
  if (!windowEl) {
    return
  }
  const windowRect = windowEl.getBoundingClientRect()
  const size = Math.max(button.clientWidth, button.clientHeight)
  const color = getComputedStyle(button).color

  const ripple = document.createElement('span')
  ripple.className = 'plugin-ripple'
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`
  ripple.style.left = `${event.clientX - windowRect.left - size / 2}px`
  ripple.style.top = `${event.clientY - windowRect.top - size / 2}px`
  ripple.style.backgroundColor = color
  windowEl.appendChild(ripple)
  setTimeout(() => ripple.remove(), 650)
}

function onBarMouseDown(widget: GuiWidget, event: MouseEvent) {
  dragging.value = {
    widget,
    offsetX: event.clientX - widget.pos.x,
    offsetY: event.clientY - widget.pos.y
  }
  event.preventDefault()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(event: MouseEvent) {
  if (!dragging.value) {
    return
  }
  dragging.value.widget.pos = {
    x: event.clientX - dragging.value.offsetX,
    y: event.clientY - dragging.value.offsetY
  }
}

function onMouseUp() {
  if (dragging.value) {
    savePos(dragging.value.widget)
    dragging.value = null
  }
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

onMounted(() => {
  buildWidgets()
  window.addEventListener('mannru-plugins', refresh)
})

onUnmounted(() => {
  window.removeEventListener('mannru-plugins', refresh)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

watch(() => route.path, refresh)
</script>

<template>
  <div class="plugin-windows">
    <div
      v-for="widget in widgets"
      :key="widget.plugin.id"
      class="plugin-window"
      :style="{ left: `${widget.pos.x}px`, top: `${widget.pos.y}px` }"
    >
      <div
        class="plugin-window__bar"
        @mousedown="onBarMouseDown(widget, $event)"
      >
        <span>{{ widget.plugin.name }}</span>
        <button
          type="button"
          aria-label="Закрыть виджет"
          @mousedown.stop
          @click="closeWidget(widget)"
        >
          ×
        </button>
      </div>
      <div
        class="plugin-window__body"
        @click="onWidgetAction(widget, $event)"
        @pointerdown="spawnRipple"
        v-html="widget.html"
      />
    </div>
  </div>
</template>

<style scoped>
.plugin-windows {
  position: fixed;
  z-index: 1300;
  inset: 0;
  pointer-events: none;
}

.plugin-window {
  position: fixed;
  width: 270px;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.plugin-window__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgb(var(--v-theme-surface-variant));
  cursor: move;
  user-select: none;
  font-size: 12.5px;
  font-weight: 700;
}

.plugin-window__bar button {
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.plugin-window__body {
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.55;
}

/* Vuetify-style buttons: <button data-plugin-action="..." data-variant data-size data-color> */
.plugin-window__body :deep(button) {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.28s;
}

/* Material ripple on widget buttons — lives in the window root, survives re-renders */
.plugin-window :deep(.plugin-ripple) {
  position: absolute;
  border-radius: 50%;
  opacity: 0.35;
  transform: scale(0);
  animation: plugin-ripple 0.6s ease-out forwards;
  pointer-events: none;
}

.plugin-window__body :deep(button:hover) {
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
}

.plugin-window__body :deep(button:active) {
  box-shadow: 0 3px 3px -2px rgba(0, 0, 0, 0.2), 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 1px 8px 0 rgba(0, 0, 0, 0.12);
}

.plugin-window__body :deep(button[data-variant='tonal']) {
  background: rgb(var(--v-theme-primary) / 0.12);
  color: rgb(var(--v-theme-primary));
  box-shadow: none;
}

.plugin-window__body :deep(button[data-variant='outlined']) {
  border: 1px solid rgb(var(--v-theme-primary) / 0.7);
  background: transparent;
  color: rgb(var(--v-theme-primary));
  box-shadow: none;
}

.plugin-window__body :deep(button[data-variant='text']) {
  padding: 0 12px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  box-shadow: none;
}

.plugin-window__body :deep(button[data-color='secondary']) {
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
}

.plugin-window__body :deep(button[data-color='error']) {
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
}

.plugin-window__body :deep(button[data-size='small']) {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
}

.plugin-window__body :deep(button[data-size='large']) {
  height: 44px;
  padding: 0 20px;
  font-size: 15px;
}

/* inline icons: <i class="material-icons">bolt</i> */
.plugin-window__body :deep(.material-icons) {
  font-size: 1.3em;
  line-height: 1;
  vertical-align: middle;
}

.plugin-window__body :deep(input),
.plugin-window__body :deep(select),
.plugin-window__body :deep(textarea) {
  margin: 2px 0;
  padding: 4px 6px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
}

@keyframes plugin-ripple {
  to {
    opacity: 0;
    transform: scale(2.4);
  }
}
</style>
