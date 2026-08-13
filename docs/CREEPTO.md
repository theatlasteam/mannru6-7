# Маннру Creepto — Маннкоин-кликер в плагинах

Встроенная зависимость `ctx.creepto` — курс Маннкоина, клики, апгрейды
и конвертация. **Курс и изменение курса убраны из базового контекста** —
теперь только здесь: `await ctx.creepto.rate()`.

```js
const manifest = {
  name: 'Маннкоин-виджет',
  type: 'gui',
  dependencies: ['creepto']
}
```

---

## Функции

### `rate()` — курс и свечи

```js
const data = await this.$ctx.creepto.rate()
// { rate, change, ohlc: { date, open, high, low, close },
//   history: [{ date, open, high, low, close }, ...] } — 30 дневных свечей
```

### `click()` — клик по Маннкоину

```js
const { creepto, gained } = await this.$ctx.creepto.click()
```

### `upgrade()` — апгрейд силы клика

```js
const { creepto, clickPower, cost } = await this.$ctx.creepto.upgrade()
```

### `convert(cardId)` — конвертация Маннкоинов в МР на карту

```js
const { creepto, cardBalance, convertedMp, rate } = await this.$ctx.creepto.convert(card.id)
```

---

## Пример: виджет курса со свечами

```js
const manifest = { name: 'Курс', type: 'tab', dependencies: ['creepto', 'charts'] }

const component = {
  data() { return { rate: 0, change: 0, chart: '' } },
  async mounted() {
    const data = await this.$ctx.creepto.rate()
    this.rate = data.rate
    this.change = data.change
    this.chart = this.$ctx.charts.line({
      data: data.history.map(c => c.close),
      labels: [new Date(data.history[0].date).toLocaleDateString('ru-RU'), 'сегодня']
    }).svg()
  },
  template: `
    <v-card class="pa-6">
      <h3>Курс: {{ rate.toFixed(1) }} МР ({{ change >= 0 ? '+' : '' }}{{ change.toFixed(1) }})</h3>
      <div v-html="chart"></div>
    </v-card>
  `
}
```
