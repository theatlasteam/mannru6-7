# Маннру Money — деньги для плагинов

Встроенная зависимость `ctx.money` — переводы средств между игроком и домом.
**Дом — владелец плагина, игрок — текущий пользователь.** Все операции
выполняются сервером атомарно (баланс не может уйти в минус) и записываются
в общий реестр транзакций.

Объявление в манифесте:

```js
const manifest = {
  name: 'Казино',
  type: 'tab',
  dependencies: ['money']
}
```

Доступно во всех GUI- и таб-плагинах (`ctx.money`), только если заявлено.

> ⚠️ Доверяйте только надёжным плагинам: деньги уходят реальному владельцу
> плагина. Это способ запустить своё казино/игру с реальными Маннрублями.

---

## Операции

Все возвращают `Promise<{ ok, op, ledgerId, amount, fee, from, to, balance, houseBalance }>`
(`balance` — кошелёк игрока, `houseBalance` — кошелёк дома).

### `bet(amount)` — ставка (escrow)

Игрок ставит: сумма уходит дому и держится как ставка.

```js
const bet = await this.$ctx.money.bet(100)
// → { ok: true, op: 'bet', ledgerId: '...', amount: 100, balance: 900, houseBalance: 1100 }
```

### `settle(betId, win)` — расчёт ставки

Дом рассчитывает ставку: `win` МР выплачивается игроку из баланса дома.
`win: 0` — дом забирает ставку. Двойной расчёт одной ставки невозможен.

```js
await ctx.money.settle(bet.ledgerId, 150)   // игрок выиграл ×1.5
await ctx.money.settle(bet.ledgerId, 0)     // игрок проиграл
```

### `pay(amount, to?)` — выплата от дома

Дом платит игроку (или любому пользователю по id) — призы, награды.

### `take(amount)` — дом забирает у игрока

Штрафы, плата за вход, покупка игровых предметов.

### `transfer(to, amount)` — перевод между игроками

Игрок переводит другому пользователю. Комиссия **2%** (минимум 1 МР)
остаётся у дома.

### `gift(amount, to?)` — подарок от дома

Дом дарит игроку (или любому пользователю) безвозмездно.

### `loan(amount, interestPct?)` — займ от дома

Дом выдаёт игроку займ под процент (по умолчанию 10%). Займ открыт,
пока не погашен.

### `repay(loanId)` — погашение займа

Игрок возвращает займ + проценты дому. Займ закрывается.

---

## Пример: мини-казино на вкладке

```js
const manifest = { name: 'Казино', type: 'tab', dependencies: ['money'] }

const component = {
  data() { return { bet: 50, result: '', balance: 0 } },
  mounted() { this.$ctx.snackbar('Казино открыто!') },
  methods: {
    async spin() {
      const stake = await this.$ctx.money.bet(this.bet)
      this.balance = stake.balance
      const win = Math.random() < 0.45 ? this.bet * 2 : 0
      const settle = await this.$ctx.money.settle(stake.ledgerId, win)
      this.result = win > 0 ? `Выигрыш +${win} МР!` : 'Проигрыш'
      this.balance = settle.balance
    }
  },
  template: `
    <v-card class="pa-6">
      <v-text-field v-model.number="bet" label="Ставка" type="number" />
      <v-btn color="primary" @click="spin">Крутить</v-btn>
      <p>{{ result }} · Баланс: {{ balance }} МР</p>
    </v-card>
  `
}
```
