import { auth, db } from '~~/server/utils/auth'

const DEFAULT_MODEL = 'qwen3.7-plus'
const MAX_PROMPT = 4000
const MAX_MESSAGES = 20
const MAX_TOTAL_CHARS = 8000

type ChatMessage = { role: 'system' | 'user' | 'assistant', content: string }
type AiOptions = { system?: string, temperature?: number, maxTokens?: number }

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const pluginId = getRouterParam(event, 'id')
  const plugin = db.prepare('SELECT id FROM plugin WHERE id = ?').get(pluginId) as { id: string } | undefined

  if (!plugin) {
    throw createError({ statusCode: 404, statusMessage: 'Плагин не найден' })
  }

  const body = await readBody<{ prompt?: unknown, messages?: unknown, system?: unknown, count?: unknown, json?: unknown, options?: unknown }>(event)

  const options = (body.options ?? {}) as AiOptions
  const system = String(body.system ?? '').trim().slice(0, MAX_PROMPT)
  const count = Math.min(4, Math.max(1, Math.floor(Number(body.count) || 1)))
  const jsonMode = body.json === true

  /* сборка сообщений: системный промпт + диалог или простой запрос */
  const messages: ChatMessage[] = []
  if (system) {
    messages.push({ role: 'system', content: system })
  }
  if (Array.isArray(body.messages)) {
    if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      throw createError({ statusCode: 400, statusMessage: `От 1 до ${MAX_MESSAGES} сообщений` })
    }
    for (const raw of body.messages) {
      const message = raw as ChatMessage
      const role = message?.role === 'system' || message?.role === 'assistant' ? message.role : 'user'
      messages.push({ role, content: String(message?.content ?? '').slice(0, MAX_PROMPT) })
    }
  } else {
    const prompt = String(body.prompt ?? '').trim()
    if (!prompt) {
      throw createError({ statusCode: 400, statusMessage: 'Пустой запрос' })
    }
    messages.push({ role: 'user', content: prompt.slice(0, MAX_PROMPT) })
  }

  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0)
  if (totalChars > MAX_TOTAL_CHARS) {
    throw createError({ statusCode: 400, statusMessage: `Слишком много текста (макс. ${MAX_TOTAL_CHARS} символов)` })
  }

  const temperature = Math.min(2, Math.max(0, Number(options.temperature) || 0.7))
  const maxTokens = Math.min(4096, Math.max(1, Math.floor(Number(options.maxTokens) || 1024)))
  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL ?? DEFAULT_MODEL

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'ИИ не настроен: задайте AI_API_KEY в .env' })
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        n: count,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages
      })
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: `Не удалось связаться с ИИ по адресу ${baseUrl}` })
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw createError({ statusCode: 502, statusMessage: `ИИ ответил ошибкой ${response.status}: ${text.slice(0, 160)}` })
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number, completion_tokens?: number }
  }

  const usage = data.usage
    ? { promptTokens: data.usage.prompt_tokens ?? 0, completionTokens: data.usage.completion_tokens ?? 0 }
    : null

  const contents = (data.choices ?? [])
    .map(choice => String(choice.message?.content ?? '').trim())
    .filter(Boolean)

  if (contents.length === 0) {
    throw createError({ statusCode: 502, statusMessage: 'ИИ вернул пустой ответ' })
  }

  if (count > 1) {
    return { choices: contents, model, usage }
  }

  const content = contents[0]!
  if (jsonMode) {
    let json: Record<string, unknown> | null = null
    try {
      json = JSON.parse(content) as Record<string, unknown>
    } catch {
      /* модель могла обернуть JSON в текст — оставляем null */
    }
    return { content, json, model, usage }
  }

  return { content, model, usage }
})
