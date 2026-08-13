import { mannruCharts } from '~~/shared/plugin-deps/charts'
import { mannruUtils } from '~~/shared/plugin-deps/utils'
import { mannruRandom } from '~~/shared/plugin-deps/random'
import { mannruTimer } from '~~/shared/plugin-deps/timer'
import { createAiClient } from '~~/shared/plugin-deps/ai'
import { createThreeClient } from '~~/shared/plugin-deps/three'
import { createConfettiClient } from '~~/shared/plugin-deps/confetti'
import { createCardsClient } from '~~/shared/plugin-deps/cards'
import { createCreeptoClient } from '~~/shared/plugin-deps/creepto'

export type PluginCtxBase = {
  rate: number
  change: number
  xp: number
  name: string
  route: string
  theme: string
}

export type PluginCtxOptions = {
  base: PluginCtxBase
  pluginId: string
  state: Record<string, unknown>
  deps: string[]
  setXp: (value: number) => void
  showSnackbar: (message: string) => void
  setTheme: (name: string) => void
  navigate: (path: string) => void
}

const pluginListeners = new Map<string, Set<(data: unknown) => void>>()

const themeVarOverrides = new Map<string, string>()

function hexToRgb(hex: string): [number, number, number] | null {
  let value = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$/.test(value) && !/^[0-9a-fA-F]{6}$/.test(value)) {
    return null
  }
  if (value.length === 3) {
    value = value.split('').map(character => character + character).join('')
  }
  const number = parseInt(value, 16)
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
}

function getThemeClassName(): string {
  for (const className of document.querySelector<HTMLElement>('.v-application')?.classList ?? []) {
    if (className.startsWith('v-theme--')) {
      return className
    }
  }
  return 'v-theme--mannruLight'
}

function syncThemeOverrideStyle() {
  const styleTag = document.getElementById('mannru-theme-override') as HTMLStyleElement | null
  if (themeVarOverrides.size === 0) {
    styleTag?.remove()
    return
  }
  const themeClass = getThemeClassName()
  const declarations = [...themeVarOverrides.entries()]
    .map(([name, rgb]) => `--v-theme-${name}: ${rgb} !important;`)
    .join('')
  const tag = styleTag ?? document.createElement('style')
  tag.id = 'mannru-theme-override'
  tag.textContent = [
    `:root, .${themeClass}, .${themeClass} * { ${declarations} }`,
    '.v-btn, .v-card, .v-table, .v-tab, .v-stepper-vertical-item__avatar { transition-property: box-shadow, transform, opacity, color, height, --v-elevation-overlay; }'
  ].join(' ')
  if (!styleTag) {
    document.head.appendChild(tag)
  }
}

function setThemeColorVar(name: string, hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return
  }
  themeVarOverrides.set(name, rgb.join(', '))
  if (name === 'primary') {
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
    themeVarOverrides.set('on-primary', luminance > 0.55 ? '23, 36, 14' : '255, 255, 255')
  }
  syncThemeOverrideStyle()
}

export function createPluginCtx(options: PluginCtxOptions) {
  const { base, pluginId, state, deps, setXp, showSnackbar, setTheme, navigate } = options
  const hasDep = (name: string) => deps.includes(name)

  const fetchJson = (url: unknown, requestOptions?: unknown) => {
    if (typeof url !== 'string' || !url.startsWith('/')) {
      return Promise.resolve(null)
    }
    const opts = (requestOptions ?? {}) as {
      params?: Record<string, unknown>
      method?: string
      body?: unknown
      headers?: Record<string, string>
    }

    let target = url
    const params = opts.params
    if (params && typeof params === 'object') {
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          query.append(key, String(value))
        }
      }
      const encoded = query.toString()
      if (encoded) {
        target += (target.includes('?') ? '&' : '?') + encoded
      }
    }

    const method = typeof opts.method === 'string' ? opts.method.toUpperCase() : 'GET'
    const hasBody = opts.body !== undefined && opts.body !== null
    const body = hasBody
      ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body))
      : undefined
    const headers: Record<string, string> = {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(opts.headers ?? {})
    }

    return window.fetch(target, { method, headers, body, credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
  }

  /* серверные вызовы зависимостей money и ai — внутри замыкания, где есть fetchJson */
  const moneyApi = (op: string, body: Record<string, unknown>) => fetchJson(`/api/plugins/${pluginId}/money`, {
    method: 'POST',
    body: { op, ...body }
  })
  const aiApi = (body: Record<string, unknown>) => fetchJson(`/api/plugins/${pluginId}/ai`, {
    method: 'POST',
    body
  })

  const toggleTheme = () => {
    setTheme(base.theme === 'mannruDark' ? 'mannruLight' : 'mannruDark')
  }

  return {
    xp: base.xp,
    name: base.name,
    route: base.route,
    theme: base.theme,
    state,
    ...(hasDep('charts') ? { charts: mannruCharts } : {}),
    ...(hasDep('utils') ? { utils: mannruUtils } : {}),
    ...(hasDep('random') ? { random: mannruRandom } : {}),
    ...(hasDep('timer') ? { timer: mannruTimer } : {}),
    ...(hasDep('ai') ? {
      ai: createAiClient(body => aiApi(body))
    } : {}),
    ...(hasDep('three') ? {
      three: createThreeClient()
    } : {}),
    ...(hasDep('confetti') ? {
      confetti: createConfettiClient()
    } : {}),
    ...(hasDep('cards') ? {
      cards: createCardsClient((url, options) => fetchJson(url, options))
    } : {}),
    ...(hasDep('creepto') ? {
      creepto: createCreeptoClient((url, options) => fetchJson(url, options))
    } : {}),
    ...(hasDep('money') ? {
      money: {
        bet: (amount: unknown) => moneyApi('bet', { amount }),
        settle: (betId: unknown, win: unknown) => moneyApi('settle', { betId, win }),
        pay: (amount: unknown, to?: unknown) => moneyApi('pay', { amount, to }),
        take: (amount: unknown) => moneyApi('take', { amount }),
        transfer: (to: unknown, amount: unknown) => moneyApi('transfer', { to, amount }),
        gift: (amount: unknown, to?: unknown) => moneyApi('gift', { amount, to }),
        loan: (amount: unknown, interestPct = 10) => moneyApi('loan', { amount, interestPct }),
        repay: (loanId: unknown) => moneyApi('repay', { loanId })
      }
    } : {}),
    setXp(value: unknown) {
      const number = Number(value)
      if (!Number.isNaN(number)) {
        setXp(number)
      }
    },
    snackbar(message: unknown) {
      showSnackbar(String(message))
    },
    setTheme(name: unknown) {
      if (typeof name === 'string') {
        setTheme(name)
      }
    },
    toggleTheme,
    setThemeColor(name: unknown, hex: unknown) {
      if (typeof name === 'string' && typeof hex === 'string') {
        setThemeColorVar(name, hex)
      }
    },
    resetThemeColors() {
      themeVarOverrides.clear()
      syncThemeOverrideStyle()
    },
    navigate(path: unknown) {
      if (typeof path === 'string' && path.startsWith('/')) {
        navigate(path)
      }
    },
    /* ═══ деньги казино: дом — владелец плагина, игрок — текущий пользователь ═══ */
    openUrl(url: unknown) {
      if (typeof url !== 'string') {
        return
      }
      if (url.startsWith('/')) {
        window.open(url, '_blank')
      } else if (/^https?:\/\//.test(url)) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    clipboard(text: unknown) {
      const value = String(text ?? '')
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).catch(() => {})
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
    },
    setTitle(title: unknown) {
      if (typeof title === 'string') {
        document.title = title
      }
    },
    emit(event: unknown, data?: unknown) {
      if (typeof event !== 'string') {
        return
      }
      const listeners = pluginListeners.get(event) ?? new Set()
      for (const listener of listeners) {
        listener(data)
      }
    },
    on(event: unknown, callback: unknown) {
      if (typeof event !== 'string' || typeof callback !== 'function') {
        return () => {}
      }
      const listeners = pluginListeners.get(event) ?? new Set()
      listeners.add(callback as (data: unknown) => void)
      pluginListeners.set(event, listeners)
      return () => {
        listeners.delete(callback as (data: unknown) => void)
      }
    },
    storage: {
      get(key: unknown) {
        try {
          return localStorage.getItem(String(key))
        } catch {
          return null
        }
      },
      set(key: unknown, value: unknown) {
        try {
          localStorage.setItem(String(key), String(value))
        } catch {
          /* ignore */
        }
      }
    },
    fetchJson,
    db: {
      get: async (key: unknown) => {
        const data = await fetchJson(`/api/plugins/${pluginId}/db/${encodeURIComponent(String(key))}`) as { value?: unknown } | null
        return data?.value ?? null
      },
      set: async (key: unknown, value: unknown) => {
        await fetchJson(`/api/plugins/${pluginId}/db`, {
          method: 'POST',
          body: { key: String(key), value }
        })
      },
      remove: async (key: unknown) => {
        await fetchJson(`/api/plugins/${pluginId}/db/${encodeURIComponent(String(key))}`, { method: 'DELETE' })
      },
      all: async () => {
        const data = await fetchJson(`/api/plugins/${pluginId}/db`) as { entries?: { key: string, value: unknown }[] } | null
        return data?.entries ?? []
      },
      clear: async () => {
        await fetchJson(`/api/plugins/${pluginId}/db/clear`, { method: 'POST' })
      }
    }
  }
}
