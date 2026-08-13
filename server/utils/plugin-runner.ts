import { normalizeDeps } from '~~/shared/plugin-deps/utils'

type PluginManifest = {
  name: string
  desc: string
  version: string
  type: string
  icon: string
  dependencies: string[]
}

/* Runs user plugin code in a tiny sandbox. The code must define
 * `manifest` and `hooks` (a plain object of functions). Errors are
 * swallowed — a broken plugin must never break the bank. */
export function runPluginCode(code: string) {
  const body = `${code}\n;return { manifest: typeof manifest !== 'undefined' ? manifest : undefined, hooks: typeof hooks !== 'undefined' ? hooks : undefined, component: typeof component !== 'undefined' ? component : undefined };`
  const sandbox = new Function('ctx', body)
  const ctx = {
    Date,
    Math,
    JSON,
    console: { log: () => {}, error: () => {} }
  }

  const result = sandbox(ctx) as { manifest?: PluginManifest, hooks?: Record<string, unknown>, component?: unknown } | undefined

  return {
    manifest: {
      name: String(result?.manifest?.name ?? 'Без названия').slice(0, 40),
      desc: String(result?.manifest?.desc ?? '').slice(0, 120),
      version: String(result?.manifest?.version ?? '1.0').slice(0, 12),
      type: result?.manifest?.type === 'gui' || result?.manifest?.type === 'tab' ? result.manifest.type : 'action',
      icon: String(result?.manifest?.icon ?? '').slice(0, 60),
      dependencies: normalizeDeps(result?.manifest?.dependencies ?? (result?.manifest as Record<string, unknown> | undefined)?.deps)
    },
    hooks: typeof result?.hooks === 'object' && result.hooks ? result.hooks : {},
    component: result?.component
  }
}
