<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import pluginsDocs from '~~/docs/PLUGINS.md?raw'
import chartsDocs from '~~/docs/CHARTS.md?raw'
import utilsDocs from '~~/docs/MANNRU-UTILS.md?raw'
import moneyDocs from '~~/docs/MONEY.md?raw'
import randomDocs from '~~/docs/RANDOM.md?raw'
import timerDocs from '~~/docs/TIMER.md?raw'
import aiDocs from '~~/docs/AI.md?raw'
import threeDocs from '~~/docs/THREE.md?raw'
import confettiDocs from '~~/docs/CONFETTI.md?raw'
import cardsDocs from '~~/docs/CARDS.md?raw'
import creeptoDocs from '~~/docs/CREEPTO.md?raw'
import { mannruCharts } from '~~/shared/plugin-deps/charts'
import { mannruUtils } from '~~/shared/plugin-deps/utils'
import { mannruRandom } from '~~/shared/plugin-deps/random'
import { mannruTimer } from '~~/shared/plugin-deps/timer'
import { createConfettiClient } from '~~/shared/plugin-deps/confetti'
import { createAiClient } from '~~/shared/plugin-deps/ai'

definePageMeta({
  layout: 'dashboard'
})

const snackbar = useSnackbar()

const sections = [
  { title: 'Плагины', icon: 'extension', file: 'docs/PLUGINS.md', text: pluginsDocs },
  { title: 'Charts', icon: 'bar_chart', file: 'docs/CHARTS.md', text: chartsDocs },
  { title: 'Mannru Utils', icon: 'handyman', file: 'docs/MANNRU-UTILS.md', text: utilsDocs },
  { title: 'Money', icon: 'payments', file: 'docs/MONEY.md', text: moneyDocs },
  { title: 'Random', icon: 'casino', file: 'docs/RANDOM.md', text: randomDocs },
  { title: 'Timer', icon: 'schedule', file: 'docs/TIMER.md', text: timerDocs },
  { title: 'AI', icon: 'smart_toy', file: 'docs/AI.md', text: aiDocs },
  { title: '3D', icon: 'view_in_ar', file: 'docs/THREE.md', text: threeDocs },
  { title: 'Confetti', icon: 'celebration', file: 'docs/CONFETTI.md', text: confettiDocs },
  { title: 'Cards', icon: 'credit_card', file: 'docs/CARDS.md', text: cardsDocs },
  { title: 'Creepto', icon: 'currency_bitcoin', file: 'docs/CREEPTO.md', text: creeptoDocs }
]

const activeSection = ref(0)
const active = computed(() => sections[activeSection.value] ?? sections[0]!)

/* ═══ markdown с живыми сниппетами ═══ */
const snippetCodes: string[] = []

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const md = new MarkdownIt({ html: false, linkify: true })
md.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index]!
  const code = token.content
  const lang = token.info?.trim() || ''
  const snippetIndex = snippetCodes.length
  snippetCodes.push(code)
  return [
    '<div class="doc-snippet">',
    '<pre class="doc-snippet__code"><code>' + escapeHtml(code) + '</code></pre>',
    '<div class="doc-snippet__bar">',
    `<span class="doc-snippet__lang">${escapeHtml(lang || 'js')}</span>`,
    `<button type="button" class="doc-snippet__run" data-index="${snippetIndex}">▶ Запустить</button>`,
    '</div>',
    `<div class="doc-snippet__output" data-index="${snippetIndex}" hidden></div>`,
    '</div>'
  ].join('')
}

const renderedMarkdown = computed(() => {
  snippetCodes.length = 0
  return md.render(active.value.text)
})

/* контекст для живых сниппетов — то же, что у плагинов */
const docsCtx = {
  charts: mannruCharts,
  utils: mannruUtils,
  random: mannruRandom,
  timer: mannruTimer,
  confetti: createConfettiClient(),
  state: {},
  ai: createAiClient(() => Promise.reject(new Error('ctx.ai доступен только внутри плагина (dependencies: [\'ai\'])'))),
  snackbar: (message: unknown) => snackbar.show(String(message), 'info')
}

async function runSnippet(index: number, button: HTMLButtonElement) {
  const output = document.querySelector<HTMLElement>(`.doc-snippet__output[data-index="${index}"]`)
  if (!output) {
    return
  }
  button.disabled = true
  output.hidden = false
  output.textContent = '…'
  const code = snippetCodes[index] ?? ''
  try {
    let value: unknown
    /* gui-стиль: render(ctx) { ... } — методы-объекта, превращаем все в функции
     * (не вызываются, кроме render/run) и выполняем с контекстом */
    if (/^\s*(?:render|run|onAction|onInit)\s*\(/m.test(code)) {
      const guiCode = code.replace(/^(\s*)([A-Za-z_$][\w$]*)(\s*\()/gm, '$1function $2$3')
      const fn = new Function('ctx', `${guiCode};return typeof render !== 'undefined' ? render(ctx) : typeof run !== 'undefined' ? run(ctx) : undefined`)
      value = await fn(docsCtx)
    } else {
      /* обычный или async-сниппет (с await) */
      try {
        value = new Function('ctx', code)(docsCtx)
      } catch {
        value = await new Function('ctx', `return (async () => { ${code} })()`)(docsCtx)
      }
    }
    if (typeof value === 'function') {
      value = await (value as (ctx: unknown) => unknown)(docsCtx)
    }
    renderOutput(output, value)
  } catch (error) {
    output.textContent = `Ошибка: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    button.disabled = false
  }
}

function renderOutput(output: HTMLElement, value: unknown) {
  if (typeof value === 'string' && value.includes('<svg')) {
    output.innerHTML = value
    return
  }
  if (value && typeof value === 'object' && typeof (value as { svg?: unknown }).svg === 'function') {
    output.innerHTML = String((value as { svg: () => string }).svg())
    return
  }
  if (value === undefined || value === null) {
    output.textContent = 'Готово ✓'
    return
  }
  if (typeof value === 'string') {
    output.textContent = value
    return
  }
  output.innerHTML = `<pre class="doc-snippet__json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`
}

function onDocsClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.doc-snippet__run')
  if (button) {
    runSnippet(Number(button.dataset.index), button)
  }
}

async function copyActive() {
  try {
    await navigator.clipboard.writeText(active.value.text)
    snackbar.show('Документация скопирована в буфер обмена', 'success')
  } catch {
    snackbar.show('Не удалось скопировать', 'error')
  }
}
</script>

<template>
  <v-container class="pa-6 pa-md-10">
    <div class="d-flex flex-wrap justify-space-between align-end ga-4 mb-6">
      <div>
        <div class="text-overline text-secondary">
          справочник
        </div>
        <h1 class="text-3xl md:text-4xl font-weight-bold mt-1 mb-1">
          Документация плагинов
        </h1>
        <p class="text-body-medium text-medium-emphasis mb-0">
          Markdown с живыми примерами: нажмите «▶ Запустить» под любым сниппетом —
          он выполнится прямо здесь с настоящим контекстом плагина.
        </p>
      </div>
    </div>

    <v-card>
      <v-tabs
        v-model="activeSection"
        color="primary"
        grow
        class="px-2"
      >
        <v-tab
          v-for="(section, index) in sections"
          :key="section.title"
          :value="index"
        >
          <v-icon
            :icon="section.icon"
            size="small"
            class="me-1"
          />
          {{ section.title }}
        </v-tab>
      </v-tabs>
      <v-divider />
      <v-card-text>
        <div
          class="docs-markdown"
          @click="onDocsClick"
          v-html="renderedMarkdown"
        />
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <p class="text-body-small text-medium-emphasis flex-grow-1 mb-0">
          Файл: {{ active.file }}
        </p>
        <v-btn
          color="primary"
          prepend-icon="content_copy"
          @click="copyActive"
        >
          Копировать раздел
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<style scoped>
.docs-markdown {
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.6;
  font-size: 14.5px;
}

.docs-markdown :deep(h1) {
  margin: 0 0 14px;
  font-size: 26px;
  font-weight: 800;
}

.docs-markdown :deep(h2) {
  margin: 26px 0 10px;
  font-size: 19px;
  font-weight: 700;
}

.docs-markdown :deep(h3) {
  margin: 20px 0 8px;
  font-size: 15.5px;
  font-weight: 700;
}

.docs-markdown :deep(p) {
  margin: 8px 0;
}

.docs-markdown :deep(ul),
.docs-markdown :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}

.docs-markdown :deep(code) {
  padding: 1px 5px;
  border-radius: 5px;
  background: rgb(var(--v-theme-surface-variant));
  font-family: monospace;
  font-size: 0.9em;
}

.docs-markdown :deep(table) {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13.5px;
}

.docs-markdown :deep(th),
.docs-markdown :deep(td) {
  padding: 7px 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  text-align: left;
}

.docs-markdown :deep(th) {
  background: rgb(var(--v-theme-surface-variant));
  font-weight: 700;
}

.docs-markdown :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 14px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 0 8px 8px 0;
  background: rgb(var(--v-theme-primary) / 0.08);
}

/* сниппеты */
.doc-snippet {
  margin: 14px 0;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 12px;
}

.doc-snippet__code {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  background: #12151a;
  color: #d4d4d4;
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.55;
}

.doc-snippet__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgb(var(--v-theme-surface-variant));
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.doc-snippet__lang {
  font-family: monospace;
  font-size: 11px;
  opacity: 0.55;
  text-transform: uppercase;
}

.doc-snippet__run {
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.doc-snippet__run:disabled {
  opacity: 0.55;
  cursor: wait;
}

.doc-snippet__output {
  padding: 12px 14px;
  border-top: 1px dashed rgba(0, 0, 0, 0.15);
  background: rgb(var(--v-theme-surface-variant) / 0.6);
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}

.doc-snippet__output svg {
  max-width: 100%;
  height: auto;
}

.doc-snippet__json {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
