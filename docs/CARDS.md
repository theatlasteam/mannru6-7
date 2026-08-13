# Маннру Cards — банковские карты в плагинах

Встроенная зависимость `ctx.cards` — управление банковскими картами пользователя:
выпуск, переводы, мутации, гадание, удаление. Все операции серверные,
с проверкой владельца (карты чужих недоступны).

```js
const manifest = {
  name: 'Мой банк',
  type: 'tab',
  dependencies: ['cards']
}
```

---

## Функции

### `list()` — мои карты

```js
const { cards } = await this.$ctx.cards.list()
// cards: [{ id, name, tier, number, last4, color, balance, mutations, behavior, createdAt, mutationLog }]
```

### `create({ name?, tier? })` — выпустить карту

`tier`: `tier1`..`tier5` (должен быть открыт по XP).

```js
const result = await this.$ctx.cards.create({ name: 'Моя карта', tier: 'tier2' })
// { card, balance, xp, bonus, cost, mutated, behavior, leveledUp }
```

### `transfer(cardId, amount, direction?)` — перевод

`direction`: `'to-card'` (кошелёк → карта) или `'to-wallet'` (карта → кошелёк).

```js
await this.$ctx.cards.transfer(card.id, 100, 'to-wallet')
```

### `mutate(cardId, name?)` — мутация

```js
const { card, tier, cost } = await this.$ctx.cards.mutate(card.id)
```

### `gamble(cardId)` — гадание (рулетка карт)

```js
const { result, card } = await this.$ctx.cards.gamble(card.id)
// result: 'upgrade' | 'mutation' | 'loss' (при loss карта сгорает)
```

### `remove(cardId)` — удалить карту

```js
await this.$ctx.cards.remove(card.id)
```

---

## Пример: виджет баланса карт

```js
const manifest = { name: 'Карты', type: 'tab', dependencies: ['cards'] }

const component = {
  data() { return { cards: [] } },
  async mounted() {
    const data = await this.$ctx.cards.list()
    this.cards = data.cards
  },
  template: `
    <v-card class="pa-6">
      <v-table>
        <thead><tr><th>Карта</th><th>Тир</th><th>Баланс</th></tr></thead>
        <tbody>
          <tr v-for="card in cards" :key="card.id">
            <td>{{ card.name }}</td><td>{{ card.tier }}</td><td>{{ card.balance }} МР</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  `
}
```
