/* Client-side plugin runner for GUI plugins (always-on widgets) and tab plugins. */
import { normalizeDeps } from '~~/shared/plugin-deps/utils'

export function runPluginClient(code: string) {
  const body = `${code}\n;return { manifest: typeof manifest !== 'undefined' ? manifest : undefined, hooks: typeof hooks !== 'undefined' ? hooks : undefined, component: typeof component !== 'undefined' ? component : undefined };`
  const fn = new Function('ctx', body)
  const ctx = {
    Date,
    Math,
    JSON
  }

  const result = fn(ctx) as {
    manifest?: Record<string, unknown>
    hooks?: Record<string, unknown>
    component?: Record<string, unknown>
  }

  return {
    manifest: {
      ...result?.manifest,
      dependencies: normalizeDeps((result?.manifest?.dependencies as unknown) ?? (result?.manifest?.deps as unknown))
    },
    hooks: result?.hooks,
    component: result?.component
  }
}
