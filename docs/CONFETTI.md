# Маннру Confetti — конфетти для плагинов

Встроенная зависимость `ctx.confetti` — праздничный дождь из конфетти поверх
всего интерфейса. Без внешних библиотек: прозрачный canvas-слой появляется,
анимируется и сам удаляется. Работает в GUI-окнах и таб-плагинах.

```js
const manifest = {
  name: 'Праздник',
  type: 'tab',
  dependencies: ['confetti']
}
```

---

## Функции

### `confetti.burst(options?)` — один взрыв

```js
this.$ctx.confetti.burst()
this.$ctx.confetti.burst({ count: 200, colors: ['#9DE258', '#64B5F6', '#FFD54F'] })
```

### `confetti.rain(options?)` — непрерывный дождь несколько секунд

```js
this.$ctx.confetti.rain({ duration: 3000 })
```

## Опции

```js
{
  count: 120,               // количество частиц (10..600)
  colors: ['#9DE258', ...], // цвета (hex-строки или числа)
  duration: 2800            // сколько жить слою, мс
}
```

---

## Пример: салют при выигрыше

```js
const manifest = { name: 'Джекпот', type: 'tab', dependencies: ['confetti', 'random'] }

const component = {
  methods: {
    win() {
      this.$ctx.confetti.rain({ duration: 2500, colors: ['#FFD54F', '#9DE258'] })
      this.$ctx.snackbar('ДЖЕКПОТ! +' + this.$ctx.random.int(100, 500) + ' МР')
    }
  },
  template: `
    <v-card class="pa-6">
      <v-btn color="primary" size="x-large" @click="win">Крутить джекпот</v-btn>
    </v-card>
  `
}
```


---

## Живой пример

```js
ctx.confetti.burst({ count: 180 })
return 'Смотрите наверх! 🎉'
```
