# Маннру 6.7 — Плагины

Плагины Маннру — это пользовательский JavaScript-код, который рисует плавающие окна
(GUI-плагины), запускается кнопкой «Запустить» (хук `run`) и может читать контекст банка.
Плагины не влияют на балансы — это чистый клиентский песочница с GUI.

---

## 1. Структура плагина

Каждый плагин — обычный JS-код, который определяет два объекта:

```js
const manifest = {
  name: 'Название плагина',      // строка, до 40 символов
  desc: 'Короткое описание',     // строка, до 120 символов
  version: '1.0',                // строка, до 12 символов
  type: 'action',                // 'action' | 'gui' | 'tab'
  icon: 'bar_chart',             // иконка в боковой панели (только таб-плагины), Material Symbols
  dependencies: ['charts', 'utils'] // заявленные зависимости, см. раздел 2
}

const hooks = {
  // функции-хуки, см. ниже
}
```

- `type: 'action'` (по умолчанию) — хук-плагин: сервер вызывает его хуки при действиях.
- `type: 'gui'` — GUI-плагин: его `render(ctx)` рисует **плавающее окно** поверх интерфейса.
  Окно можно перетаскивать за заголовок, закрывать; позиция запоминается в localStorage.
  Включается/выключается переключателем, запуск кнопкой «Запустить» включает окно, если хук
  `run` не определён.
- `type: 'tab'` — таб-плагин: вкладка в кабине с **полноценным Vue-кодом** (см. раздел 8).

Код исполняется в песочнице: доступны только `Date`, `Math`, `JSON` и заглушка `console`
(в серверных хуках дополнительно доступен `utils` — см. раздел «Зависимости»).
Ошибки в плагине никогда не ломают банк — они молча игнорируются.

---

## 2. Хуки

### `run(ctx)` — любой тип

Вызывается кнопкой «Запустить» в интерфейсе. Может вернуть строку (или объект — будет
превращён в JSON) — результат показывается пользователю.

Если хук `run` не определён:

- для GUI-плагина — запуск просто включает окно (выходное сообщение:
  «Виджет включён в боковой панели»);
- для остальных — возвращается заглушка «Плагин запущен. Хук run не определён.»

`ctx`:

```js
{
  xp: 388,          // опыт пользователя
  name: 'Клиент'    // имя пользователя
}
```

Курс Маннкоина больше не в базовом контексте — он в зависимости `ctx.creepto`
(см. раздел «Зависимости»): `await ctx.creepto.rate()`.

Плагины не могут выдавать деньги или менять балансы — только читать контекст,
рисовать окна и управлять клиентским отображением.

### `render(ctx)` — тип `gui`

Возвращает HTML-строку (или объект `{ title, text }`) для плавающего окна.
Окна поддерживают интерактив: кнопки и поля ввода (см. раздел 4).

`ctx` для GUI-плагинов:

```js
{
  xp: 388,          // опыт (клиентская копия)
  name: 'Клиент',   // имя
  state: { },       // изменяемое состояние окна (переживает перерисовки)
  setXp(value),     // изменить отображаемый опыт (клиентская сторона)
  snackbar(msg),    // показать сообщение
  storage: { get(key), set(key, value) },  // localStorage-обёртка
  fetchJson(url, options),  // same-origin fetch (только относительные пути)
  db: { get, set, remove, all, clear },   // JSON-мини-БД плагина (см. ниже)
  setTheme(name),          // 'mannruLight' | 'mannruDark' — тема всего приложения
  toggleTheme(),           // переключить светлую/тёмную
  setThemeColor(name, hex) // перекрасить переменную темы на лету: 'primary', 'secondary', 'surface' и т.д.
  resetThemeColors(),      // вернуть цвета темы по умолчанию
  navigate(path),          // SPA-переход (относительный путь)
  openUrl(url),            // открыть ссылку в новой вкладке (относительная или http(s))
  clipboard(text),         // скопировать в буфер обмена
  setTitle(title),         // сменить заголовок вкладки
  emit(event, data),       // событие между плагинами
  on(event, cb),           // подписка на событие плагинов (возвращает отписку)
  route,                   // текущий путь, например '/dashboard'
  theme,                   // текущая тема: 'mannruLight' | 'mannruDark'
  charts,                  // графики: line, bar, candle, pie (см. «Зависимости»)
  utils                    // утилиты: fmtMoney, sleep, sortBy и др. (см. «Зависимости»)
}
```

### Зависимости: Charts и Mannru Utils

Библиотеки нужно **явно заявить в манифесте** — только тогда они появятся в контексте:

```js
const manifest = {
  name: 'График курса',
  type: 'tab',
  icon: 'candlestick_chart',
  dependencies: ['charts', 'utils']
}
```

Без объявления `ctx.charts` / `ctx.utils` будут `undefined` (так же как
`this.$charts` / `this.$utils` в таб-плагинах). Неизвестные имена в
`dependencies` молча игнорируются. Доступно: `'charts'`, `'utils'`, `'money'`,
`'random'`, `'timer'`, `'ai'`, `'three'`, `'confetti'`, `'cards'`, `'creepto'`
(синоним поля — `deps: [...]`).

**Зависимости могут зависеть от других зависимостей**: если библиотека требует
`utils`, она подтягивается автоматически. Например, `dependencies: ['random']`
само по себе включает и `utils` — в манифесте можно писать меньше. Граф: `random`,
`timer` и `money` требуют `utils`.

- **`ctx.ai`** — запросы к языковой модели: `ai.prompt(text)`, `ai.chat(messages)`,
  `ai.system(system, user?)`, `ai.choices(text, count?)`, `ai.json(system, user?)`.
  Ключ, адрес API и модель хранятся на сервере (`.env`). Полный справочник —
  вкладка «AI» в диалоге документации, файл `docs/AI.md`.
- **`ctx.three`** — 3D-рендеринг на Three.js (только таб-плагины): фигуры
  (box, sphere, torus, cone, cylinder, plane, points), свет, орбитальная камера,
  `loop()`, клики по фигурам, скриншоты. Полный справочник — вкладка «3D»
  в диалоге документации, файл `docs/THREE.md`.
- **`ctx.cards`** — банковские карты: `list()`, `create({name, tier})`,
  `transfer(cardId, amount, direction)`, `mutate(cardId, name?)`, `gamble(cardId)`,
  `remove(cardId)`. Полный справочник — вкладка «Cards», файл `docs/CARDS.md`.
- **`ctx.creepto`** — Маннкоин-кликер: `rate()` (курс + свечи ohlc/history),
  `click()`, `upgrade()`, `convert(cardId)`. Курс и изменение курса убраны из
  базового контекста — теперь только здесь. Полный справочник — вкладка
  «Creepto», файл `docs/CREEPTO.md`.

- **`ctx.charts`** — SVG-графики: `line`, `area` (через `fill`), `bar`, `candle` (японские свечи),
  `pie`. Каждый метод возвращает `{ svg() }` — разметку для `v-html`. Цвета следуют теме.
  Полный справочник — вкладка «Charts» в диалоге документации, файл `docs/CHARTS.md`.
- **`ctx.utils`** — чистые функции-помощники: форматирование чисел/дат, математика,
  массивы, строки, `sleep`, `deepClone` и др. Полный справочник — вкладка
  «Mannru Utils» в диалоге документации, файл `docs/MANNRU-UTILS.md`.

В серверных хук-плагинах доступен только `ctx.utils` (в `run` и других серверных хуках),
и только если он заявлен в `dependencies`.

- **`ctx.money`** — переводы средств между игроком и владельцем плагина («домом»):
  ставки (escrow), расчёт ставок, выплаты, штрафы, переводы с комиссией, подарки,
  займы под проценты. Атомарно, с реестром транзакций. Полный справочник —
  вкладка «Money» в диалоге документации, файл `docs/MONEY.md`.
  Доверяйте только надёжным плагинам: деньги уходят реальному владельцу плагина.

Пример «умного» виджета с темами:

```js
const hooks = {
  render(ctx) {
    return '<button data-plugin-action="theme"><i class="material-icons">palette</i> Тема</button> ' +
      '<button data-plugin-action="paint"><i class="material-icons">format_color_fill</i> Лайм</button>'
  },
  onAction(action, fields, ctx) {
    if (action === 'theme') {
      ctx.toggleTheme()
      return { message: 'Тема: ' + (ctx.theme === 'mannruDark' ? 'светлая' : 'тёмная') }
    }
    if (action === 'paint') {
      ctx.setThemeColor('primary', '#ff4da6')
      return { message: 'Теперь всё розовое' }
    }
  }
}
```

`setThemeColor` переопределяет CSS-переменную `--v-theme-*` на корне приложения —
мгновенно перекрашивает кнопки, карточки и панели. Для `primary` автоматически
подбирается контрастный `on-primary`.

### JSON-мини-БД плагина (`ctx.db`)

Каждый плагин имеет собственное персистентное JSON-хранилище на сервере
(таблица `plugin_data`, доступ только у владельца):

- `db.get(key)` → `Promise<value | null>`
- `db.set(key, value)` → `Promise<void>` (любое JSON-значение, upsert)
- `db.remove(key)` → `Promise<void>`
- `db.all()` → `Promise<[{ key, value }]>`
- `db.clear()` → `Promise<void>`

Значение хранится как JSON (лимит 10 000 символов). Асинхронные хуки поддержаны:
`onAction` и `onInit` могут быть `async`.

`onInit(ctx)` вызывается при открытии окна (после `render`) — удобно подгружать
данные из БД и перерисовывать:

### `fetchJson(url, options)` — запросы к API банка

Доступны только относительные пути (`/api/...`). Возвращает `Promise<JSON>`.
Опции:

- `params` — объект, превращается в query-параметры и **дополняет** URL
- `method` — `GET` (по умолчанию) | `POST` | `DELETE` и т.д.
- `body` — объект (JSON) или строка
- `headers` — дополнительные заголовки

Пример:

```js
onAction(action, fields, ctx) {
  if (action === 'rate') {
    ctx.fetchJson('/api/creepto/rate', { params: { cache: Date.now() } })
      .then(data => ctx.snackbar('Курс: ' + data.rate.toFixed(1)))
    return { message: 'Запрашиваю курс...' }
  }
  if (action === 'signout-ish') {
    return ctx.fetchJson('/api/xp/buy', {
      method: 'POST',
      body: { amount: 10 },
      params: { dry: '1' }
    }).then(() => ({ message: 'Готово' }))
  }
}
```

### `onAction(action, fields, ctx)` — тип `gui`

Вызывается при клике по элементу окна с атрибутом `data-plugin-action`.

- `action` — строка из `data-plugin-action`
- `fields` — объект значений всех полей с `data-field` внутри окна
- `ctx` — как в `render`, включая `state`, `setXp`, `snackbar`, `storage`, `fetchJson`

Может вернуть `{ message: string }` — сообщение в snackbar. После вызова окно
перерисовывается заново через `render(ctx)` (с обновлённым `state`).

---

## 3. Публикация

- Плагин публикуется через интерфейс («Опубликовать») или через API: `POST /api/plugins`.
- Приватный плагин — виден только владельцу (по умолчанию).
- Публичный плагин — попадает в «Магазин плагинов», виден всем клиентам.
- GUI-плагины включаются/выключаются переключателем.

## 4. Окна: кнопки и поля

Кнопки в окнах — это кнопки в стиле Vuetify. В HTML из `render(ctx)` можно использовать:

```html
<button data-plugin-action="click">Текст</button>
<button data-plugin-action="tonal" data-variant="tonal">Тональная</button>
<button data-plugin-action="outlined" data-variant="outlined">Контурная</button>
<button data-plugin-action="text" data-variant="text">Текстовая</button>
<button data-plugin-action="go" data-color="secondary">Цветная</button>
<button data-plugin-action="del" data-color="error">Опасная</button>
<button data-plugin-action="small" data-size="small">Маленькая</button>
```

- `data-plugin-action` — кликабельный элемент, вызывает `onAction`
- `data-variant` — `tonal` | `outlined` | `text` (по умолчанию — заливка primary)
- `data-color` — `secondary` | `error` (по умолчанию primary)
- `data-size` — `small` | `large` (по умолчанию средняя)

**Инлайн-иконки**: внутри кнопки (и в любом месте HTML) можно вставлять Material Symbols
через класс `material-icons`:

```html
<button data-plugin-action="click"><i class="material-icons">add</i> +1</button>
```

Поля ввода:

```html
<input data-field="amount" value="10">
```

`data-field` — поле ввода, его значение попадёт в `fields` при вызове `onAction`.

Пример счётчика:

```js
const manifest = { name: 'Счётчик', desc: 'Интерактивный виджет', version: '1.0', type: 'gui' }

const hooks = {
  render(ctx) {
    const count = ctx.state.count || 0
    return '<b>Счёт: ' + count + '</b> <button data-plugin-action="plus">+1</button>'
  },
  onAction(action, fields, ctx) {
    if (action === 'plus') {
      ctx.state.count = (ctx.state.count || 0) + 1
      return { message: 'Теперь ' + ctx.state.count }
    }
  }
}
```

## 5. API плагинов

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/api/plugins` | Список своих плагинов |
| POST | `/api/plugins` | Опубликовать плагин: `{ code, isPublic }` |
| POST | `/api/plugins/test` | Проверить код без сохранения: `{ code }` → `{ manifest, hooks }` |
| POST | `/api/plugins/:id/run` | Запустить плагин (свой или публичный) |
| POST | `/api/plugins/:id/toggle` | Вкл/выкл action-плагина |
| DELETE | `/api/plugins/:id` | Удалить свой плагин |
| GET | `/api/plugins/gui` | Активные GUI-плагины + контекст `{ plugins, ctx }` |
| GET | `/api/plugins/marketplace` | Публичные плагины других клиентов |

Все эндпоинты требуют сессию (cookie `better-auth.session_token`).

## 6. Курс Маннкоина

Курс Маннкоина не фиксирован — он плавно дрейфует вокруг 67 (синусоиды от времени).
`GET /api/creepto/rate` возвращает `{ rate, change }`. Конвертация использует текущий курс:
`МР = floor(Маннкоин / rate)`.

---

## 7. Полный список API

Базовый URL: `http://localhost:3000`. Все эндпоинты (кроме регистрации/входа) требуют
сессионную cookie `better-auth.session_token`. Ошибки возвращаются как
`{ statusCode, statusMessage }` (обычно 400/401/404).

### Аутентификация

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| POST | `/api/auth/sign-up/email` | `{ name, email, password }` | `{ token, user, session }` |
| POST | `/api/auth/sign-in/email` | `{ email, password }` | `{ token, user, session }` |
| POST | `/api/auth/sign-out` | — | `{}` |
| GET | `/api/auth/get-session` | — | `{ session, user }` |

Пользователь (`user`) содержит поля: `id, name, email, emailVerified, image,
balance, xp, creepto, clickPower, lastCheckin`.

### Карты

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| GET | `/api/cards` | — | `{ cards }` |
| POST | `/api/cards` | `{ name, tier }` | `{ card, behavior, mutated, balance, xp, bonus, cost, leveledUp }` |
| DELETE | `/api/cards/:id` | — | `{ ok }` |
| POST | `/api/cards/:id/transfer` | `{ amount, direction: 'to-card' \| 'to-wallet' }` | `{ wallet, cardBalance, bonus, creepto }` |
| POST | `/api/cards/:id/mutate` | `{ name? }` | `{ card, tier, cost }` |
| POST | `/api/cards/:id/gamble` | — | `{ result, card, tier, behavior, mutated, cost, message }` |

Карта (`card`) содержит поля: `id, name, tier, number, last4, color, balance,
mutations, mutationLog, behavior, createdAt`.

- Первая карта: +1000 МР на карту и +50 XP. Последующие: 500 МР.
- 25% шанс, что карта родится мутированной (случайное поведение).
- Номер карты: 16 цифр `67 + тир + 6/7-скелет + случайные + контрольная цифра Luhn`.

Тиры: `tier1` «Шесть семь» (0 XP) · `tier2` «Мемель» (150) · `tier3` «Процентщик» (400) ·
`tier4` «Олигарх» (1000) · `tier5` «Банкир 6.7» (2500).

Поведения карт: `normal` · `greedy` (+6.7% к пополнению) · `generous` (+6.7 МР к снятию) ·
`miner` (+1 Маннкоин при пополнении) · `lucky` (мутации бесплатны).

### Маннкоин-кликер

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| GET | `/api/creepto/rate` | — | `{ rate, change, ohlc, history }` |
| POST | `/api/creepto/click` | — | `{ creepto, gained }` |
| POST | `/api/creepto/upgrade` | — | `{ creepto, clickPower, cost }` |
| POST | `/api/creepto/convert` | `{ cardId }` | `{ creepto, cardBalance, convertedMp, rate }` |

Клик даёт `clickPower` Маннкоинов (по умолчанию 1). Апгрейд клика стоит
`clickPower * 100` Маннкоинов. Конвертация: `МР = floor(Маннкоин / rate)`,
курс меняется со временем.

### Опыт

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| POST | `/api/checkin` | — | `{ xp, gained }` (+6.7 XP, раз в день) |
| POST | `/api/xp/buy` | `{ amount }` | `{ balance, xp, gainedXp, rate }` (10 МР = 1 XP) |

Уровни: 1 Новичок воображения (0) · 2 Мемель (100) · 3 Вкладчик (250) · 4 Процентщик (500) ·
5 Олигарх (1000) · 6 Банкир 6.7 (2000) · 7 Хозяин Маннру (4000) · 8 Легенда версии 7.0 (8000).

### Плагины

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| GET | `/api/plugins` | — | `{ plugins }` |
| POST | `/api/plugins` | `{ code, isPublic }` | `{ plugin, hooks }` |
| POST | `/api/plugins/test` | `{ code }` | `{ manifest, hooks }` |
| GET | `/api/plugins/gui` | — | `{ plugins, ctx }` |
| GET | `/api/plugins/marketplace` | — | `{ plugins }` |
| POST | `/api/plugins/:id/run` | — | `{ output }` |
| POST | `/api/plugins/:id/toggle` | — | `{ active }` |
| DELETE | `/api/plugins/:id` | — | `{ ok }` |

Плагин (`plugin`) содержит поля: `id, name, desc, version, type, code, active,
isPublic, createdAt`.

---

## 8. Таб-плагины (полный Vue)

`type: 'tab'` — плагин становится вкладкой в кабинете. Плагин определяет объект
`component` — Vue-компонент (Options API) с обычным `template`. Шаблон компилируется
на клиенте, доступны **все компоненты Vuetify**.

```js
const manifest = { name: 'Мой таб', desc: 'Вкладка с Vue', version: '1.0', type: 'tab' }

const component = {
  data() {
    return { count: 0, rate: 0 }
  },
  async mounted() {
    const data = await this.$ctx.fetchJson('/api/creepto/rate')
    this.rate = data ? data.rate : 0
  },
  template: `
    <v-card class="pa-6">
      <v-btn color="primary" prepend-icon="add" @click="count++">
        Нажато {{ count }}
      </v-btn>
      <v-divider class="my-4" />
      <div>Курс Маннкоина: {{ rate ? rate.toFixed(1) : '...' }}</div>
    </v-card>
  `
}
```

Доступно в компоненте:

- `this.$ctx` — полный контекст плагина (`fetchJson`, `db`, `snackbar`, `setXp`, `storage`, данные курса)
- `inject('ctx')` — тот же контекст через provide/inject
- `this.$charts` / `this.$utils` — зависимости Charts и Mannru Utils, только если заявлены в `manifest.dependencies`
- Все компоненты Vuetify (`v-btn`, `v-card`, `v-text-field`, `v-table`, ...)
- Options API: `data`, `computed`, `methods`, `watch`, `mounted`, `beforeUnmount` и т.д.

В боковой панели таб-плагин отображается с иконкой из манифеста:
`icon: 'candlestick_chart'` (Material Symbols, по умолчанию `extension`).

Включение/выключение — переключателем на странице плагинов. Кнопка «Запустить»
вызывает `hooks.run(ctx)`, если он есть.
