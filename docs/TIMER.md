# Маннру Timer — время и таймеры для плагинов

Встроенная зависимость `ctx.timer` — таймеры, отсчёты и форматирование времени.
Требует `utils` (подтягивается автоматически — достаточно `dependencies: ['timer']`).
`interval`/`countdown` возвращают хендл со `stop()` — в таб-плагинах останавливайте
таймеры в `beforeUnmount`, чтобы ничего не текло.

---

## Таймеры

| Функция | Описание | Пример |
| --- | --- | --- |
| `sleep(ms)` | пауза (Promise) | `await timer.sleep(500)` |
| `delay(ms)` | то же, что sleep | `await timer.delay(1000)` |
| `timeout(cb, ms)` | разовый вызов, `{ cancel() }` | `timer.timeout(() => {}, 1000).cancel()` |
| `interval(cb, ms)` | периодический вызов, `{ stop() }` | `const t = timer.interval(tick, 1000); ... t.stop()` |
| `countdown(sec, onTick, onDone?)` | обратный отсчёт, `{ stop() }` | `timer.countdown(10, s => this.left = s, () => this.finish())` |
| `stopwatch()` | секундомер: `{ start(), stop() → ms, elapsed() → ms }` | `const sw = timer.stopwatch(); sw.start(); ... sw.stop()` |

## Время

| Функция | Описание | Пример |
| --- | --- | --- |
| `now()` | timestamp | `timer.now()` |
| `timestamp()` | `ЧЧ:ММ:СС` сейчас | `timer.timestamp()` → `14:05:33` |
| `fmtTime(ts)` | `ЧЧ:ММ:СС` из timestamp | `timer.fmtTime(Date.now())` |
| `fmtDuration(ms)` | человекочитаемо | `timer.fmtDuration(3723000)` → `1 ч 02 мин` |
| `fmtCountdown(ms)` | `ММ:СС` | `timer.fmtCountdown(90000)` → `01:30` |

## Пример: таймер раунда в казино

```js
const manifest = { name: 'Таймер', type: 'tab', dependencies: ['timer'] }

const component = {
  data() { return { left: 10 } },
  mounted() {
    this.tick = this.$ctx.timer.countdown(10,
      s => { this.left = s },
      () => { this.$ctx.snackbar('Раунд окончен!') }
    )
  },
  beforeUnmount() {
    this.tick?.stop()
  },
  template: `
    <v-card class="pa-6">
      <v-progress-linear :model-value="left * 10" color="primary" height="10" rounded />
      <p class="text-h5 mt-3">Осталось: {{ left }} с</p>
    </v-card>
  `
}
```


---

## Живой пример

```js
await ctx.timer.sleep(400) // пауза 400 мс
return 'Прошло ' + ctx.timer.fmtCountdown(400) + ' · сейчас ' + ctx.timer.timestamp()
```
