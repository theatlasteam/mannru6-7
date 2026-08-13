/* Mannru AI — запросы к языковой модели через сервер банка.
 * Модуль определяет API зависимости; вызовы идут на серверный эндпоинт
 * /api/plugins/:id/ai, где хранятся ключ и адрес API (в плагин не попадают).
 * Модель берётся из .env (AI_MODEL). */

export type AiMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AiUsage = {
  promptTokens: number
  completionTokens: number
}

export type AiOptions = {
  system?: string
  temperature?: number
  maxTokens?: number
}

export type AiResult = {
  content: string
  model: string
  usage: AiUsage | null
}

export type AiChoicesResult = {
  choices: string[]
  model: string
  usage: AiUsage | null
}

export type AiJsonResult = {
  content: string
  json: Record<string, unknown> | null
  model: string
  usage: AiUsage | null
}

export function createAiClient(call: (body: Record<string, unknown>) => Promise<unknown>) {
  const request = (body: Record<string, unknown>): Promise<AiResult> => call(body) as Promise<AiResult>

  return {
    /* простой запрос */
    prompt(text: string, options?: AiOptions): Promise<AiResult> {
      return request({ prompt: text, options })
    },
    /* диалог с полным контролем над сообщениями */
    chat(messages: AiMessage[], options?: AiOptions): Promise<AiResult> {
      return request({ messages, options })
    },
    /* запрос с системным промптом (и необязательным сообщением пользователя) */
    system(systemPrompt: string, userMessage?: string, options?: AiOptions): Promise<AiResult> {
      return request({ system: systemPrompt, prompt: userMessage, options })
    },
    /* несколько вариантов ответа на один запрос */
    choices(text: string, count = 3, options?: AiOptions): Promise<AiChoicesResult> {
      return request({ prompt: text, count, options }) as Promise<AiChoicesResult>
    },
    /* ответ строго в JSON: json(systemPrompt, userPrompt?) → { content, json, ... } */
    json(systemPrompt: string, userPrompt?: string, options?: AiOptions): Promise<AiJsonResult> {
      return request({ system: systemPrompt, prompt: userPrompt, json: true, options }) as Promise<AiJsonResult>
    }
  }
}

export type MannruAi = ReturnType<typeof createAiClient>
