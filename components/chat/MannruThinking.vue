<script setup lang="ts">
/* Thinking — expandable agent trace with four variants.
 * Runs once, settles, and remains expandable. */

const props = withDefaults(
  defineProps<{
    variant?: 'Steps' | 'Reasoning' | 'Search' | 'Coding'
  }>(),
  { variant: 'Steps' }
)

const STAGES = [800, 600, 1800, 2600, 1600]

type Row = {
  primary: string
  secondary?: string
  mono?: boolean
  add?: number
  del?: number
  href?: string
}

type Variant = { active: string, done: string, rows: Row[], query?: string }

const VARIANTS: { Steps: Variant, Reasoning: Variant, Search: Variant, Coding: Variant } = {
  Steps: {
    active: 'Думаю',
    done: 'Подумал за 4 секунды',
    rows: [
      { primary: 'Проверяю баланс 6.7' },
      { primary: 'Ищу ваши 67 рублей' },
      { primary: 'Сравниваю ставки', secondary: '6.7 варианта' },
      { primary: 'Пишу справку о воображении' }
    ]
  },
  Reasoning: {
    active: 'Рассуждаю',
    done: 'Поразмышлял за 4 секунды',
    rows: [
      { primary: 'Летом спрос растёт на лимонный вкус — «Лимон 6.7» лидирует.' },
      { primary: 'Надо проверить запасы наличных, прежде чем рекламировать снятие.' }
    ]
  },
  Search: {
    active: 'Ищу в интернете',
    done: 'Нашёл в интернете',
    query: 'где мои 67 рублей',
    rows: [
      { primary: 'Маннру 6.7', secondary: 'маннру.рф', href: 'https://mannru.example/' },
      { primary: 'Минфин', secondary: 'minfin.gov.ru', href: 'https://minfin.gov.ru/' },
      { primary: 'ЦБ РФ', secondary: 'cbr.ru', href: 'https://cbr.ru/' }
    ]
  },
  Coding: {
    active: 'Запускаю инструменты',
    done: 'Запустил 3 инструмента',
    rows: [
      { primary: 'Читаю', secondary: 'balance.ts', mono: true },
      { primary: 'Правлю', secondary: 'InterestRate.tsx', mono: true, add: 67, del: 0 },
      { primary: 'Запускаю', secondary: 'bun run печатать-деньги', mono: true }
    ]
  }
}

const stage = ref(0)
const manualExpanded = ref<boolean | null>(null)
const selectedTool = ref<string | null>(null)
const traceRef = ref<HTMLElement>()
const lineHeight = ref(0)

const v = computed(() => VARIANTS[props.variant] ?? VARIANTS.Steps)
const autoExpanded = computed(() => stage.value >= 1 && stage.value < 4)
const expanded = computed(() => manualExpanded.value ?? autoExpanded.value)
const working = computed(() => stage.value < 3)
const visible = computed(() => {
  if (stage.value < 2) {
    return 0
  }
  if (stage.value === 2) {
    return Math.min(2, v.value.rows.length)
  }
  return v.value.rows.length
})

let timer: ReturnType<typeof setTimeout> | undefined

function tick() {
  if (stage.value >= STAGES.length - 1) {
    return
  }
  timer = setTimeout(() => {
    stage.value += 1
    tick()
  }, STAGES[stage.value])
}

onMounted(tick)

onUnmounted(() => {
  clearTimeout(timer)
})

watch([visible, expanded], () => {
  nextTick(() => {
    lineHeight.value = traceRef.value?.offsetHeight ?? 0
  })
})

const TONES = ['bg-accent', 'bg-orange', 'bg-green']
</script>

<template>
  <div class="mannru-thinking">
    <button
      type="button"
      :aria-expanded="expanded"
      class="mannru-thinking__header"
      @click="manualExpanded = !(manualExpanded ?? autoExpanded)"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        :fill="working ? 'var(--ink-2)' : 'var(--ink-3)'"
      >
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      </svg>
      <span
        v-if="working"
        class="mannru-thinking__active"
      >
        {{ v.active }}
      </span>
      <span
        v-else
        class="mannru-thinking__done"
      >
        {{ v.done }}
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ink-3)"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="mannru-thinking__chevron"
        :style="{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div
      class="mannru-thinking__body"
      :class="{ 'mannru-thinking__body--open': expanded }"
    >
      <div class="mannru-thinking__overflow">
        <div class="mannru-thinking__trace">
          <span
            aria-hidden="true"
            class="mannru-thinking__line"
            :style="{ height: lineHeight ? `${lineHeight - 2}px` : '0px' }"
          />
          <div
            ref="traceRef"
            class="mannru-thinking__rows"
          >
            <div
              v-if="v.query"
              class="mannru-thinking__row"
              :style="{ animation: expanded ? 'fade-up 300ms cubic-bezier(0.23,1,0.32,1) both' : 'none' }"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-3)"
                stroke-width="2"
                stroke-linecap="round"
                class="mannru-thinking__icon"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span class="mannru-thinking__query">{{ v.query }}</span>
            </div>

            <template
              v-for="(row, i) in v.rows.slice(0, visible)"
              :key="row.primary"
            >
              <a
                v-if="variant === 'Search'"
                :href="row.href"
                target="_blank"
                rel="noreferrer"
                class="mannru-thinking__row"
                :style="{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both` }"
              >
                <span
                  class="mannru-thinking__dot"
                  :class="TONES[i % 3]"
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                    />
                    <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                  </svg>
                </span>
                <span class="mannru-thinking__text">{{ row.primary }}</span>
                <span class="mannru-thinking__secondary">{{ row.secondary }}</span>
              </a>

              <button
                v-else-if="variant === 'Coding'"
                type="button"
                class="mannru-thinking__row"
                :class="{ 'mannru-thinking__row--selected': selectedTool === row.primary }"
                :aria-pressed="selectedTool === row.primary"
                :style="{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both` }"
                @click="selectedTool = selectedTool === row.primary ? null : row.primary"
              >
                <span class="mannru-thinking__text">{{ row.primary }}</span>
                <span
                  class="mannru-thinking__secondary"
                  :class="{ 'mannru-thinking__secondary--mono': row.mono }"
                >
                  {{ row.secondary }}
                </span>
                <span
                  v-if="row.add !== undefined"
                  class="mannru-thinking__diff"
                >
                  <span class="mannru-thinking__diff-add">+{{ row.add }}</span>
                  <span class="mannru-thinking__diff-del">−{{ row.del }}</span>
                </span>
              </button>

              <div
                v-else
                class="mannru-thinking__row"
                :style="{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both` }"
              >
                <template v-if="variant === 'Steps'">
                  <svg
                    v-if="i < visible - 1 || !working"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-3)"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="mannru-thinking__icon"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span
                    v-else
                    class="mannru-thinking__spinner"
                  />
                </template>
                <span
                  class="mannru-thinking__text"
                  :class="{ 'mannru-thinking__text--soft': variant === 'Reasoning' }"
                >
                  {{ row.primary }}
                </span>
                <span
                  v-if="row.secondary"
                  class="mannru-thinking__secondary"
                >
                  {{ row.secondary }}
                </span>
              </div>
            </template>

            <span
              v-if="variant === 'Search' && stage >= 3"
              class="mannru-thinking__more"
            >
              +7 ещё
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mannru-thinking {
  display: flex;
  width: 100%;
  flex-direction: column;
}

.mannru-thinking__header {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  margin: -4px -6px;
  cursor: pointer;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  transition: background 100ms ease;
}

.mannru-thinking__header:hover {
  background: var(--hover-2);
}

.mannru-thinking__active {
  background-image: linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%);
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  animation: shimmer-text 1.4s linear infinite;
  color: transparent;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.mannru-thinking__done {
  animation: fade-in 350ms ease-out both;
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.mannru-thinking__chevron {
  transition: transform 300ms ease;
}

.mannru-thinking__body {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 400ms cubic-bezier(0.23, 1, 0.32, 1), opacity 400ms ease;
}

.mannru-thinking__body--open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.mannru-thinking__overflow {
  overflow: hidden;
}

.mannru-thinking__trace {
  position: relative;
  margin-top: 4px;
  margin-left: 5px;
  padding-left: 16px;
}

.mannru-thinking__line {
  position: absolute;
  top: 0;
  left: 3px;
  width: 1px;
  background: var(--line);
  transition: height 500ms cubic-bezier(0.23, 1, 0.32, 1);
}

.mannru-thinking__rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.mannru-thinking__row {
  display: flex;
  min-height: 28px;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  text-decoration: none;
  transition: background 150ms ease;
}

a.mannru-thinking__row:hover,
button.mannru-thinking__row:hover {
  background: var(--hover);
}

.mannru-thinking__row--selected {
  background: var(--inset);
}

.mannru-thinking__icon {
  flex: 0 0 auto;
}

.mannru-thinking__spinner {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  border: 1.5px solid var(--line-strong);
  border-top-color: var(--ink-2);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

.mannru-thinking__dot {
  display: flex;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
}

.mannru-thinking__dot.bg-accent {
  background: var(--accent);
  color: var(--accent-ink);
}

.mannru-thinking__dot.bg-orange {
  background: var(--orange);
}

.mannru-thinking__dot.bg-green {
  background: var(--green);
}

.mannru-thinking__text {
  min-width: 0;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mannru-thinking__text--soft {
  color: var(--ink-2);
  font-weight: 400;
  white-space: normal;
  line-height: 1.45;
}

.mannru-thinking__query {
  color: var(--ink-2);
  font-size: 12.5px;
}

.mannru-thinking__secondary {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--ink-3);
  font-size: 11.5px;
}

.mannru-thinking__secondary--mono {
  font-family: monospace;
}

.mannru-thinking__diff {
  flex: 0 0 auto;
  margin-left: auto;
  font-family: monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.mannru-thinking__diff-add {
  color: var(--green);
}

.mannru-thinking__diff-del {
  color: var(--red);
}

.mannru-thinking__more {
  padding-left: 6px;
  color: var(--ink-3);
  font-size: 12px;
  animation: fade-in 300ms ease-out both;
}
</style>
