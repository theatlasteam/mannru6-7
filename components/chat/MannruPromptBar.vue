<script setup lang="ts">
/* Prompt bar — composer with attach, @ data sources, / commands,
 * a model picker, dictation and send. Type @ or / to open menus. */

const emit = defineEmits<{ send: [text: string] }>()

const draft = ref('')
const plusOpen = ref(false)
const modelOpen = ref(false)
const attached = ref<string[]>([])
const connected = ref(false)
const listening = ref(false)
const active = ref(0)
const engaged = ref(false)
const expanded = ref(false)
const sweeping = ref(false)
const dismissed = ref(false)

const inputRef = ref<HTMLTextAreaElement>()
const measureRef = ref<HTMLElement>()
const controlsRef = ref<HTMLElement>()
const modelRef = ref<HTMLElement>()

const SOURCES = [
  { key: 'attach', name: 'Добавить файл', desc: 'Загрузить с компьютера', glyph: 'clip', attach: true },
  { key: 'account', name: 'Мой счёт 6.7', desc: 'Баланс и движения', glyph: 'chart' },
  { key: 'deposit', name: 'Вклад «После шести»', desc: 'Проценты и сроки', glyph: 'layers' },
  { key: 'card', name: 'Карта «Шесть семь»', desc: 'Кэшбэк и лимиты', glyph: 'card' },
  { key: 'web', name: 'Веб-поиск', desc: 'Новости и информация', glyph: 'globe' },
  { key: 'telegram', name: 'Telegram', desc: 'Переписки и каналы', glyph: 'chat' },
  { key: 'excel', name: 'Excel', desc: 'Таблицы и выгрузки', glyph: 'table', connect: true }
]

const COMMANDS = [
  { key: 'open', name: '/счёт', desc: 'Открыть счёт 6.7' },
  { key: 'deposit', name: '/вклад', desc: 'Оформить вклад' },
  { key: 'card', name: '/карта', desc: 'Заказать карту' },
  { key: 'pin', name: '/пин-код', desc: 'Напомнить пин-код' },
  { key: 'balance', name: '/баланс', desc: 'Показать баланс' }
]

const MODELS = [
  { key: 'mannru-6-7', name: 'Маннру 6.7', tag: 'Флагман' },
  { key: 'mannru-6-6', name: 'Маннру 6.6', tag: 'Базовая' },
  { key: 'vklad-04', name: 'Вкладчик 0.4', tag: 'Просрочен' }
]

const FILES = ['счёт-67.png', 'летнее-меню.pdf', 'выгрузка-pos.csv']
const DICTATION = 'сравни выходные с прошлым летом'

const GLYPHS: Record<string, string> = {
  clip: 'm21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  card: 'M2 5h20v14H2zM2 10h20',
  globe: 'M12 12a10 10 0 0 0-10 0 10 10 0 0 0 20 0 10 10 0 0 0-10-10z',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  table: 'M3 3h18v18H3zM3 9h18M3 15h18M12 3v18'
}

function parseToken(value: string): { kind: 'at' | 'slash', query: string, start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(value)
  if (!match) {
    return null
  }
  return {
    kind: match[2] === '@' ? 'at' : 'slash',
    query: match[3]!.toLowerCase(),
    start: match.index + match[1]!.length
  }
}

const token = computed(() => (dismissed.value ? null : parseToken(draft.value)))
const menu = computed<'at' | 'slash' | null>(() => plusOpen.value ? 'at' : token.value?.kind ?? null)
const query = computed(() => plusOpen.value ? '' : token.value?.query ?? '')

const rows = computed(() => {
  if (menu.value === 'at') {
    return SOURCES.filter(s => s.name.toLowerCase().includes(query.value))
  }
  if (menu.value === 'slash') {
    return COMMANDS.filter(c => c.name.slice(1).startsWith(query.value))
  }
  return []
})

watch(menu, () => {
  active.value = 0
  engaged.value = false
})

const modelIndex = computed(() => MODELS.findIndex(m => m.key === model.value.key))

const model = ref<typeof MODELS[number]>(MODELS[1]!)

function glyphPath(key: string) {
  return GLYPHS[key] ?? ''
}

function onRowEnter(index: number) {
  active.value = index
  engaged.value = true
}

function onPlusClick() {
  modelOpen.value = false
  plusOpen.value = !plusOpen.value
  inputRef.value?.focus()
}

function onInput() {
  dismissed.value = false
  plusOpen.value = false
}

function onModelClick() {
  plusOpen.value = false
  modelOpen.value = !modelOpen.value
}

function pick(row: { key: string, name: string }) {
  const source = SOURCES.find(s => s.key === row.key)
  if (source?.attach) {
    attached.value = [...attached.value, FILES[attached.value.length % FILES.length]!]
    if (token.value) {
      draft.value = draft.value.slice(0, token.value.start)
    }
  } else if (menu.value === 'at') {
    draft.value = `${token.value ? draft.value.slice(0, token.value.start) : draft.value}@${row.name} `
  } else {
    draft.value = `${token.value ? draft.value.slice(0, token.value.start) : draft.value}${row.name} `
  }
  plusOpen.value = false
  dismissed.value = false
  inputRef.value?.focus()
}

function selectModel(next: typeof MODELS[number]) {
  model.value = next
  modelOpen.value = false
  if (next.key === 'mannru-6-7') {
    celebrate()
  }
}

function celebrate() {
  if (sweeping.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  sweeping.value = true
  setTimeout(() => {
    sweeping.value = false
  }, 950)
}

const canSend = computed(() => draft.value.trim().length > 0 || attached.value.length > 0)

function send() {
  if (!canSend.value) {
    return
  }
  emit('send', draft.value.trim())
  draft.value = ''
  attached.value = []
  plusOpen.value = false
  modelOpen.value = false
  inputRef.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (menu.value && rows.value.length > 0) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      engaged.value = true
      active.value = (active.value + (event.key === 'ArrowDown' ? 1 : rows.value.length - 1)) % rows.value.length
      return
    }
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      event.preventDefault()
      pick(rows.value[active.value]!)
      return
    }
  }
  if (event.key === 'Escape') {
    dismissed.value = true
    plusOpen.value = false
    modelOpen.value = false
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

watch(draft, async () => {
  await nextTick()
  const input = inputRef.value
  const measure = measureRef.value
  if (!input || !measure) {
    return
  }
  input.style.height = '0px'
  const contentHeight = input.scrollHeight
  input.style.height = `${Math.min(Math.max(contentHeight, 28), 100)}px`
  input.style.overflowY = contentHeight > 100 ? 'auto' : 'hidden'

  if (controlsRef.value && modelRef.value) {
    const fixedWidth = 28 * 3 + modelRef.value.offsetWidth
    const gaps = 16
    const inlineWidth = controlsRef.value.clientWidth - fixedWidth - gaps
    expanded.value = draft.value.includes('\n') || measure.offsetWidth + 8 > inlineWidth
  }
})

watch(listening, (value) => {
  if (!value) {
    return
  }
  setTimeout(() => {
    draft.value = draft.value ? `${draft.value.trimEnd()} ${DICTATION}` : DICTATION
    listening.value = false
    inputRef.value?.focus()
  }, 2200)
})
</script>

<template>
  <div class="mannru-prompt">
    <div class="mannru-prompt__anchor">
      <!-- @ / slash menu -->
      <div
        v-if="menu"
        class="mannru-prompt__menu"
        :style="{ animation: 'pop-in 180ms cubic-bezier(0.23,1,0.32,1) both' }"
      >
        <button
          v-for="(row, i) in rows"
          :key="row.key"
          type="button"
          class="mannru-prompt__menu-row"
          :class="{ 'mannru-prompt__menu-row--active': i === active }"
          @mousedown.prevent
          @mouseenter="onRowEnter(i)"
          @click="pick(row)"
        >
          <span class="mannru-prompt__menu-icon">
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
              <path :d="glyphPath(SOURCES.find((s) => s.key === row.key)?.glyph ?? 'clip')" />
            </svg>
          </span>
          <span class="mannru-prompt__menu-name">{{ row.name }}</span>
          <span class="mannru-prompt__menu-desc">{{ row.desc }}</span>
          <button
            v-if="SOURCES.find((s) => s.key === row.key)?.connect"
            type="button"
            class="mannru-prompt__connect"
            :class="{ 'mannru-prompt__connect--on': connected }"
            @click.stop="connected = !connected"
          >
            {{ connected ? 'Подключено' : 'Подключить' }}
          </button>
        </button>
        <div
          v-if="rows.length === 0"
          class="mannru-prompt__empty"
        >
          Ничего не нашлось по «{{ query }}»
        </div>
        <div class="mannru-prompt__menu-hint">
          {{ menu === 'at' ? 'Ищите источники и файлы' : 'Ищите команды' }}
        </div>
      </div>

      <!-- model menu -->
      <div
        v-if="modelOpen"
        class="mannru-prompt__model-menu"
        :style="{ animation: 'pop-in 180ms cubic-bezier(0.23,1,0.32,1) both' }"
      >
        <button
          v-for="(m, i) in MODELS"
          :key="m.key"
          type="button"
          class="mannru-prompt__model-row"
          :class="{ 'mannru-prompt__model-row--active': i === modelIndex }"
          @mousedown.prevent
          @mouseenter="active = i"
          @click="selectModel(m)"
        >
          <span class="mannru-prompt__model-name">{{ m.name }}</span>
          <span class="mannru-prompt__model-tag">{{ m.tag }}</span>
        </button>
      </div>

      <!-- composer -->
      <div
        class="mannru-prompt__composer"
        :class="{ 'mannru-prompt__composer--sweeping': sweeping }"
      >
        <span
          v-if="sweeping"
          aria-hidden="true"
          class="mannru-prompt__sweep"
        />
        <span
          ref="measureRef"
          aria-hidden="true"
          class="mannru-prompt__measure"
        >
          {{ draft }}
        </span>

        <div
          v-if="attached.length > 0"
          class="mannru-prompt__attachments"
        >
          <span
            v-for="(file, i) in attached"
            :key="`${file}-${i}`"
            class="mannru-prompt__attachment"
            :style="{ animation: 'pop-in 200ms cubic-bezier(0.23,1,0.32,1) both' }"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span class="mannru-prompt__attachment-name">{{ file }}</span>
            <button
              type="button"
              :aria-label="`Убрать ${file}`"
              class="mannru-prompt__attachment-remove"
              @click="attached = attached.filter((_, j) => j !== i)"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>

        <div
          ref="controlsRef"
          class="mannru-prompt__controls"
        >
          <button
            type="button"
            aria-label="Добавить вложения и источники"
            :aria-expanded="plusOpen"
            class="mannru-prompt__control"
            :class="{ 'mannru-prompt__control--on': plusOpen }"
            @click="onPlusClick"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <textarea
            ref="inputRef"
            v-model="draft"
            rows="1"
            class="mannru-prompt__input"
            :placeholder="listening ? 'Слушаю…' : 'Напишите сообщение…'"
            aria-label="Сообщение"
            @keydown="onKeydown"
            @input="onInput"
          />

          <button
            ref="modelRef"
            type="button"
            :aria-expanded="modelOpen"
            aria-label="Выбрать модель"
            class="mannru-prompt__model"
            @click="onModelClick"
          >
            {{ model.name }}
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-3)"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <button
            type="button"
            :aria-label="listening ? 'Остановить диктовку' : 'Начать диктовку'"
            :aria-pressed="listening"
            class="mannru-prompt__control"
            :class="{ 'mannru-prompt__control--listen': listening }"
            @click="listening = !listening"
          >
            <span
              v-if="listening"
              class="mannru-prompt__eq"
            >
              <span
                v-for="i in 3"
                :key="i"
                class="mannru-prompt__eq-bar"
                :style="{ animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }"
              />
            </span>
            <svg
              v-else
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Отправить"
            :disabled="!canSend"
            class="mannru-prompt__send"
            @click="send"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mannru-prompt {
  width: 100%;
}

.mannru-prompt__anchor {
  position: relative;
}

.mannru-prompt__menu,
.mannru-prompt__model-menu {
  position: absolute;
  bottom: 100%;
  z-index: 10;
  margin-bottom: 8px;
  padding: 4px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.2);
  transform-origin: bottom center;
}

.mannru-prompt__menu {
  left: 0;
  right: 0;
}

.mannru-prompt__model-menu {
  right: 0;
  width: 190px;
}

.mannru-prompt__menu-row {
  display: flex;
  width: 100%;
  height: 36px;
  cursor: pointer;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
}

.mannru-prompt__menu-row--active {
  background: var(--hover-2);
}

.mannru-prompt__menu-icon {
  display: flex;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
}

.mannru-prompt__menu-name {
  flex: 0 0 auto;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 500;
}

.mannru-prompt__menu-desc {
  min-width: 0;
  flex: 1;
  color: var(--ink-3);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mannru-prompt__connect {
  flex: 0 0 auto;
  cursor: pointer;
  border: 0;
  background: transparent;
  color: var(--accent-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-decoration: underline;
}

.mannru-prompt__connect--on {
  color: var(--green);
  text-decoration: none;
}

.mannru-prompt__empty {
  display: flex;
  height: 36px;
  align-items: center;
  padding: 0 8px;
  color: var(--ink-3);
  font-size: 12px;
}

.mannru-prompt__menu-hint {
  margin-top: 4px;
  padding: 6px 8px 4px;
  border-top: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 11px;
}

.mannru-prompt__model-row {
  display: flex;
  width: 100%;
  height: 30px;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
}

.mannru-prompt__model-row--active {
  background: var(--hover-2);
}

.mannru-prompt__model-name {
  min-width: 0;
  flex: 1;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mannru-prompt__model-tag {
  flex: 0 0 auto;
  color: var(--ink-3);
  font-size: 11px;
}

.mannru-prompt__composer {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
  transition: border-color 150ms ease;
}

.mannru-prompt__composer:focus-within {
  border-color: var(--line-strong);
}

.mannru-prompt__sweep {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: linear-gradient(100deg, transparent 10%, #f44336 25%, #ff9800 38%, #9de258 52%, #03a9f4 66%, #673ab7 80%, transparent 90%);
  animation: rainbow-sweep 950ms cubic-bezier(0.22, 0.61, 0.25, 1) both;
  pointer-events: none;
}

.mannru-prompt__measure {
  position: absolute;
  visibility: hidden;
  font-size: 13px;
  line-height: 18px;
  white-space: pre;
  pointer-events: none;
}

.mannru-prompt__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
}

.mannru-prompt__attachment {
  display: flex;
  height: 26px;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 8px;
  background: var(--field);
  box-shadow: 0 0 0 1px var(--line);
  color: var(--ink-2);
  font-size: 11.5px;
}

.mannru-prompt__attachment-name {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mannru-prompt__attachment-remove {
  display: flex;
  width: 16px;
  height: 16px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-3);
  transition: background 100ms ease, color 100ms ease;
}

.mannru-prompt__attachment-remove:hover {
  background: var(--line);
  color: var(--ink);
}

.mannru-prompt__controls {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.mannru-prompt__control,
.mannru-prompt__send {
  display: flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-3);
  transition: background-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.mannru-prompt__control:hover {
  background: var(--hover);
  color: var(--ink);
}

.mannru-prompt__control:active {
  transform: scale(0.94);
}

.mannru-prompt__control--on {
  background: var(--hover);
  color: var(--ink);
}

.mannru-prompt__control--listen {
  background: var(--accent);
  color: var(--accent-ink);
}

.mannru-prompt__eq {
  display: flex;
  height: 14px;
  align-items: center;
  gap: 2.5px;
}

.mannru-prompt__eq-bar {
  width: 2.5px;
  height: 100%;
  border-radius: 999px;
  background: currentColor;
}

.mannru-prompt__input {
  min-width: 0;
  min-height: 28px;
  flex: 1;
  resize: none;
  padding: 5px 4px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.mannru-prompt__input::placeholder {
  color: var(--ink-3);
}

.mannru-prompt__model {
  display: flex;
  height: 28px;
  flex: 0 0 auto;
  cursor: pointer;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-2);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 150ms ease, color 150ms ease;
}

.mannru-prompt__model:hover {
  background: var(--hover);
  color: var(--ink);
}

.mannru-prompt__send {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.mannru-prompt__send:disabled {
  background: rgba(var(--v-theme-on-background), 0.3);
  color: rgba(var(--v-theme-on-background), 0.55);
  cursor: default;
}

.mannru-prompt__send:not(:disabled):active {
  transform: scale(0.94);
}
</style>
