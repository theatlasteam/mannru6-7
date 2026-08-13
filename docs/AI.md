# Маннру AI — искусственный интеллект в плагинах

Встроенная зависимость `ctx.ai` — запросы к языковой модели через сервер банка
(ключ, адрес API и модель хранятся в `.env`: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`;
в плагин секреты не попадают). Доступна во всех GUI- и таб-плагинах, если заявлена
в манифесте:

```js
const manifest = {
  name: 'Умный плагин',
  type: 'tab',
  dependencies: ['ai']
}
```

Ответы асинхронные. Каждый результат: `{ content, model, usage: { promptTokens, completionTokens } }`.
Ограничения: запрос — до 4000 символов, до 20 сообщений, всего до 8000 символов.

---

## Функции

### `ai.prompt(text, options?)` — простой запрос

```js
const result = await this.$ctx.ai.prompt('Придумай название для моей карты')
this.$ctx.snackbar(result.content)
```

### `ai.chat(messages, options?)` — диалог

`messages` — массив `{ role: 'system' | 'user' | 'assistant', content }`.

```js
const result = await this.$ctx.ai.chat([
  { role: 'system', content: 'Ты — кассир банка Маннру 6.7. Отвечай кратко.' },
  { role: 'user', content: 'Сколько стоит мутация карты?' }
])
```

### `ai.system(systemPrompt, userMessage?, options?)` — системный промпт

```js
const result = await this.$ctx.ai.system(
  'Ты — строгий кассир. Отвечай только цифрами.',
  'Курс Маннкоина?'
)
```

### `ai.choices(text, count?, options?)` — несколько вариантов

Возвращает `{ choices: string[], model, usage }` — до 4 вариантов ответа.

```js
const result = await this.$ctx.ai.choices('Название для карты «Олигарх»', 3)
for (const name of result.choices) this.$ctx.snackbar(name)
```

### `ai.json(systemPrompt, userPrompt?, options?)` — ответ строго в JSON

Возвращает `{ content, json, model, usage }` — `json` — распарсенный объект
(или `null`, если модель не смогла вернуть чистый JSON).

```js
const result = await this.$ctx.ai.json(
  'Верни JSON: {"name": "...", "price": число}',
  'Придумай карту казино'
)
if (result.json) this.$ctx.snackbar(result.json.name)
```

## Опции (у всех функций)

```js
{ system: 'системный промпт', temperature: 0.7, maxTokens: 1024 }
```

`temperature` — 0..2, `maxTokens` — 1..4096.

---

## Пример: ИИ-помощник на вкладке

```js
const manifest = { name: 'ИИ-кассир', type: 'tab', dependencies: ['ai'] }

const component = {
  data() { return { question: '', answer: '', busy: false } },
  methods: {
    async ask() {
      if (!this.question.trim()) return
      this.busy = true
      try {
        const result = await this.$ctx.ai.system('Отвечай кратко.', this.question)
        this.answer = result.content
      } finally {
        this.busy = false
      }
    }
  },
  template: `
    <v-card class="pa-6">
      <v-text-field v-model="question" label="Вопрос" @keyup.enter="ask" />
      <v-btn color="primary" :loading="busy" @click="ask">Спросить</v-btn>
      <p class="mt-4" v-if="answer">{{ answer }}</p>
    </v-card>
  `
}
```


---

## Живой пример

```js
return await ctx.ai.prompt('Придумай короткое название для карты «Олигарх»')
```
