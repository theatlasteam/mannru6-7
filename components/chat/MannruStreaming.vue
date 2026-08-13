<script setup lang="ts">
/* Streaming text — words resolve out of blur, an inline citation
 * appears in context, then actions and follow-up prompts become usable. */

const props = withDefaults(
  defineProps<{
    text?: string
    showExtras?: boolean
  }>(),
  { text: '', showExtras: false }
)

const emit = defineEmits<{ send: [text: string] }>()

const WORD_MS = 55
const CITE_AFTER = 12

type Token = { text: string, cite?: boolean }

const words = computed(() => props.text.split(' '))

const tokens = computed<Token[]>(() => {
  const result: Token[] = words.value.map(text => ({ text }))
  if (props.showExtras && result.length > CITE_AFTER) {
    result.splice(CITE_AFTER, 0, { text: '', cite: true })
  }
  return result
})

const count = ref(0)
const done = computed(() => count.value >= tokens.value.length)
const sourcesOpen = ref(false)

let interval: ReturnType<typeof setInterval> | undefined

function stop() {
  clearInterval(interval)
}

function start() {
  stop()
  interval = setInterval(() => {
    if (count.value < tokens.value.length) {
      count.value += 1
    } else {
      stop()
    }
  }, WORD_MS)
}

onMounted(start)
onUnmounted(stop)

const LOGO = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 fill=%27%239DE258%27/%3E%3Ctext x=%2716%27 y=%2722%27 font-family=%27monospace%27 font-size=%2717%27 font-weight=%27bold%27 text-anchor=%27middle%27 fill=%27%2317240E%27%3EM%3C/text%3E%3C/svg%3E'

const SOURCES = [
  { name: 'Маннру', domain: 'маннру.рф', href: 'https://mannru.example/', image: LOGO },
  { name: 'Минфин', domain: 'minfin.gov.ru', href: 'https://minfin.gov.ru/', image: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2716%27 fill=%27%232f6fec%27/%3E%3Cpath d=%27M15 43 27 31l8 7 14-18%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%277%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E' },
  { name: 'ЦБ РФ', domain: 'cbr.ru', href: 'https://cbr.ru/', image: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2716%27 fill=%27%23e56d24%27/%3E%3Cpath d=%27M17 45V25h8v20h-8Zm11 0V16h8v29h-8Zm11 0V30h8v15h-8Z%27 fill=%27%23fff%27/%3E%3C/svg%3E' }
]

const primarySource = SOURCES[0]!

const FOLLOW_UPS = [
  'Как открыть счёт 6.7?',
  'Что такое вклад «После шести»?',
  'Где мои 67 рублей?'
]

const ACTION_ICONS = [
  { key: 'copy', label: 'Копировать', paths: [
    { d: 'M9 9h12v12H9z', fill: false },
    { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1', fill: false }
  ] },
  { key: 'retry', label: 'Повторить', paths: [
    { d: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6', fill: false }
  ] },
  { key: 'up', label: 'Полезно', paths: [
    { d: 'M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z', fill: false }
  ] },
  { key: 'down', label: 'Бесполезно', paths: [
    { d: 'M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z', fill: false }
  ] }
]
</script>

<template>
  <div class="mannru-stream">
    <p class="mannru-stream__text">
      <template
        v-for="(token, index) in tokens.slice(0, count)"
        :key="index"
      >
        <a
          v-if="token.cite"
          :href="primarySource.href"
          target="_blank"
          rel="noreferrer"
          class="mannru-stream__chip"
          style="animation: pop-in 250ms cubic-bezier(0.23, 1, 0.32, 1) both"
        >
          <img
            :src="primarySource.image"
            alt=""
            class="mannru-stream__chip-image"
          >
          <span>{{ primarySource.domain }}</span>
        </a>
        <span
          v-else
          class="mannru-stream__word"
        >
          {{ token.text + ' ' }}
        </span>
      </template>
      <span
        v-if="!done"
        class="mannru-stream__cursor"
      />
    </p>

    <div
      v-if="showExtras"
      class="mannru-stream__extras"
      :style="{ opacity: done ? 1 : 0, pointerEvents: done ? 'auto' : 'none' }"
    >
      <div class="mannru-stream__actions">
        <button
          v-for="action in ACTION_ICONS"
          :key="action.key"
          type="button"
          :aria-label="action.label"
          class="mannru-stream__action"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              v-for="path in action.paths"
              :key="path.d"
              :d="path.d"
            />
          </svg>
        </button>
        <button
          type="button"
          :aria-expanded="sourcesOpen"
          class="mannru-stream__sources"
          @click="sourcesOpen = !sourcesOpen"
        >
          <span class="mannru-stream__avatars">
            <img
              v-for="source in SOURCES"
              :key="source.domain"
              :src="source.image"
              alt=""
              class="mannru-stream__avatar"
            >
          </span>
          <span>{{ SOURCES.length }} источника</span>
        </button>
      </div>

      <div
        class="mannru-stream__sources-panel"
        :style="{
          gridTemplateRows: done && sourcesOpen ? '1fr' : '0fr',
          opacity: done && sourcesOpen ? 1 : 0
        }"
      >
        <div class="mannru-stream__overflow">
          <div class="mannru-stream__source-list">
            <a
              v-for="source in SOURCES"
              :key="source.domain"
              :href="source.href"
              target="_blank"
              rel="noreferrer"
              class="mannru-stream__source"
            >
              <img
                :src="source.image"
                alt=""
                class="mannru-stream__source-image"
              >
              <span>{{ source.name }}</span>
              <span class="mannru-stream__source-domain">{{ source.domain }}</span>
            </a>
          </div>
        </div>
      </div>

      <div class="mannru-stream__followups">
        <p class="mannru-stream__followups-title">
          Продолжить
        </p>
        <button
          v-for="(item, i) in FOLLOW_UPS"
          :key="item"
          type="button"
          class="mannru-stream__followup"
          :style="{ animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both` }"
          @click="emit('send', item)"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-3)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mannru-stream__followup-icon"
          >
            <path d="M9 10l-5 5 5 5" />
            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
          </svg>
          {{ item }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mannru-stream {
  min-height: 60px;
  width: 100%;
}

.mannru-stream__text {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.55;
}

.mannru-stream__word {
  display: inline;
  animation: stream-in 420ms cubic-bezier(0.22, 0.61, 0.25, 1) both;
}

.mannru-stream__cursor {
  display: inline-block;
  width: 2px;
  height: 12px;
  margin-left: 2px;
  border-radius: 999px;
  background: var(--ink);
  animation: cursor-blink 1s steps(1) infinite;
}

.mannru-stream__chip {
  display: inline-flex;
  height: 18px;
  align-items: center;
  gap: 4px;
  margin: 0 4px;
  padding: 0 3px;
  border-radius: 5px;
  background: var(--inset);
  box-shadow: 0 0 0 1px var(--line);
  color: var(--ink-2);
  font-family: monospace;
  font-size: 10.5px;
  vertical-align: -1px;
  text-decoration: none;
  transition: background 150ms ease;
}

.mannru-stream__chip:hover {
  background: var(--hover);
  color: var(--ink);
}

.mannru-stream__chip-image {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.mannru-stream__extras {
  margin-top: 8px;
  transition: opacity 400ms ease;
}

.mannru-stream__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.mannru-stream__action {
  display: flex;
  width: 24px;
  height: 24px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  transition: background 100ms ease, color 100ms ease;
}

.mannru-stream__action:hover {
  background: var(--hover-2);
  color: var(--ink-2);
}

.mannru-stream__sources {
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
  padding: 2px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-2);
  font: inherit;
  font-size: 12px;
  text-align: left;
  transition: background 150ms ease;
}

.mannru-stream__sources:hover {
  background: var(--hover);
}

.mannru-stream__avatars {
  display: flex;
}

.mannru-stream__avatar {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 0 0 1.5px var(--surface);
}

.mannru-stream__avatar + .mannru-stream__avatar {
  margin-left: -4px;
}

.mannru-stream__sources-panel {
  display: grid;
  transition: grid-template-rows 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms ease;
}

.mannru-stream__overflow {
  overflow: hidden;
}

.mannru-stream__source-list {
  display: flex;
  flex-direction: column;
  margin-top: 6px;
  padding: 4px;
  border-radius: 10px;
  background: var(--inset);
  box-shadow: 0 0 0 1px var(--line);
}

.mannru-stream__source {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  color: var(--ink-2);
  font-size: 12px;
  text-decoration: none;
  transition: background 150ms ease, color 150ms ease;
}

.mannru-stream__source:hover {
  background: var(--hover);
  color: var(--ink);
}

.mannru-stream__source-image {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.mannru-stream__source-domain {
  margin-left: auto;
  color: var(--ink-3);
  font-family: monospace;
  font-size: 10.5px;
}

.mannru-stream__followups {
  margin-top: 10px;
  transition: opacity 400ms ease;
}

.mannru-stream__followups-title {
  margin: 0;
  color: var(--ink-2);
  font-size: 12px;
  font-weight: 500;
}

.mannru-stream__followup {
  display: flex;
  width: 100%;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 7px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  transition: background 100ms ease;
}

.mannru-stream__followup:hover {
  background: var(--hover-2);
}

.mannru-stream__followup-icon {
  flex: 0 0 auto;
}
</style>
