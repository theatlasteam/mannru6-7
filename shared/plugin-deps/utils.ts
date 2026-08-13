/* Mannru Utils — built-in helper library for plugins.
 * Pure, environment-agnostic: works in GUI windows, tab plugins and
 * server-side hook plugins. */

const ALLOWED_DEPS = new Set(['charts', 'utils', 'money', 'random', 'timer', 'ai', 'three', 'confetti', 'cards', 'creepto'])

/* Граф зависимостей: библиотека может требовать другие библиотеки.
 * Если плагин объявил зависимость, её требования подтягиваются автоматически —
 * в манифесте можно писать меньше. */
const DEP_GRAPH: Record<string, string[]> = {
  utils: [],
  charts: [],
  random: ['utils'],
  timer: ['utils'],
  money: ['utils'],
  ai: [],
  three: [],
  confetti: [],
  cards: [],
  creepto: []
}

/* Normalizes the manifest `dependencies`/`deps` field: keeps only
 * known dependency names, deduplicated, expanding transitive
 * requirements (dep → its required deps). Used by client and server
 * runners to gate which libraries a plugin may use. */
export function normalizeDeps(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : []
  const result: string[] = []
  const visit = (name: string) => {
    if (!ALLOWED_DEPS.has(name) || result.includes(name)) {
      return
    }
    result.push(name)
    for (const required of DEP_GRAPH[name] ?? []) {
      visit(required)
    }
  }
  for (const item of raw) {
    visit(String(item).trim().toLowerCase())
  }
  return result
}

export const mannruUtils = {
  /* ── числа ─────────────────────────────────────────────────── */
  fmtNumber(value: unknown, digits = 2): string {
    return Number(value).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  },
  fmtMoney(value: unknown, digits = 2): string {
    return mannruUtils.fmtNumber(value, digits) + ' МР'
  },
  fmtPercent(value: unknown, digits = 1): string {
    return mannruUtils.fmtNumber(value, digits) + '%'
  },
  fmtCompact(value: unknown): string {
    const n = Number(value)
    if (!Number.isFinite(n)) return '—'
    const abs = Math.abs(n)
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' млрд'
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' млн'
    if (abs >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + ' тыс'
    return mannruUtils.fmtNumber(n, 0)
  },
  round(value: unknown, digits = 0): number {
    const factor = 10 ** digits
    return Math.round(Number(value) * factor) / factor
  },
  clamp(value: unknown, min: unknown, max: unknown): number {
    return Math.min(Math.max(Number(value), Number(min)), Number(max))
  },
  lerp(a: unknown, b: unknown, t: unknown): number {
    return Number(a) + (Number(b) - Number(a)) * Number(t)
  },
  random(min = 0, max = 1): number {
    return min + Math.random() * (max - min)
  },
  sum(values: unknown[]): number {
    return values.reduce((acc, value) => acc + Number(value), 0)
  },
  mean(values: unknown[]): number {
    if (values.length === 0) return 0
    return mannruUtils.sum(values) / values.length
  },
  median(values: unknown[]): number {
    if (values.length === 0) return 0
    const sorted = [...values.map(Number)].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  },

  /* ── даты и время ──────────────────────────────────────────── */
  fmtDate(timestamp: unknown): string {
    const date = new Date(Number(timestamp))
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('ru-RU')
  },
  fmtTime(timestamp: unknown): string {
    const date = new Date(Number(timestamp))
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  },
  fmtDateTime(timestamp: unknown): string {
    return mannruUtils.fmtDate(timestamp) + ' ' + mannruUtils.fmtTime(timestamp)
  },

  /* ── массивы ───────────────────────────────────────────────── */
  chunk(values: unknown[], size: unknown): unknown[][] {
    const chunkSize = Math.max(1, Number(size) || 1)
    const result: unknown[][] = []
    for (let index = 0; index < values.length; index += chunkSize) {
      result.push(values.slice(index, index + chunkSize))
    }
    return result
  },
  unique(values: unknown[]): unknown[] {
    return [...new Set(values)]
  },
  last(values: unknown[]): unknown {
    return values[values.length - 1]
  },
  range(from: unknown, to?: unknown): number[] {
    const result: number[] = []
    if (to === undefined) {
      for (let index = 0; index < Number(from); index++) result.push(index)
    } else {
      for (let index = Number(from); index <= Number(to); index++) result.push(index)
    }
    return result
  },
  groupBy(values: unknown[], key: unknown): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {}
    for (const item of values) {
      const group = String(typeof key === 'function' ? (key as (item: unknown) => unknown)(item) : (item as Record<string, unknown>)[String(key)])
      ;(result[group] ??= []).push(item)
    }
    return result
  },
  sortBy(values: unknown[], key: unknown, descending = false): unknown[] {
    const sorted = [...values].sort((a, b) => {
      const left = typeof key === 'function' ? (key as (item: unknown) => unknown)(a) : (a as Record<string, unknown>)[String(key)]
      const right = typeof key === 'function' ? (key as (item: unknown) => unknown)(b) : (b as Record<string, unknown>)[String(key)]
      if (left === right) return 0
      return left < right ? -1 : 1
    })
    return descending ? sorted.reverse() : sorted
  },

  /* ── строки ────────────────────────────────────────────────── */
  capitalize(value: unknown): string {
    const text = String(value ?? '')
    return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1)
  },
  truncate(value: unknown, length: unknown): string {
    const text = String(value ?? '')
    const max = Math.max(0, Number(length) || 0)
    return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
  },
  pad(value: unknown, width: unknown, character = '0'): string {
    return String(value).padStart(Math.max(0, Number(width) || 0), character)
  },
  slugify(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .trim()
      .replace(/[ё]/g, 'е')
      .replace(/[^a-zа-я0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  },

  /* ── разное ────────────────────────────────────────────────── */
  uid(length = 8): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let index = 0; index < length; index++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return result
  },
  sleep(ms: unknown): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)))
  },
  deepClone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value))
  },
  pick(object: unknown, keys: unknown): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const source = (object ?? {}) as Record<string, unknown>
    for (const key of (keys as string[]) ?? []) {
      if (key in source) result[key] = source[key]
    }
    return result
  },
  omit(object: unknown, keys: unknown): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const source = (object ?? {}) as Record<string, unknown>
    const excluded = new Set((keys as string[]) ?? [])
    for (const key of Object.keys(source)) {
      if (!excluded.has(key)) result[key] = source[key]
    }
    return result
  }
}

export type MannruUtils = typeof mannruUtils
