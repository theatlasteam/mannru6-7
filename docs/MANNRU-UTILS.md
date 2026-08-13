# Маннру Utils — утилиты для плагинов

Встроенная зависимость `ctx.utils` — библиотека чистых функций-помощников.
Доступна во всех плагинах:

- GUI-виджеты: `ctx.utils.fmtMoney(...)`
- таб-плагины: `this.$ctx.utils.fmtMoney(...)` или `this.$utils.fmtMoney(...)`
- хук-плагины (сервер): `ctx.utils.fmtMoney(...)` в `run(ctx)`

---

## Числа

| Функция | Описание | Пример |
| --- | --- | --- |
| `fmtNumber(n, digits?)` | число с разделителями, по умолчанию 2 знака | `fmtNumber(1234.5)` → `1 234,50` |
| `fmtMoney(n, digits?)` | то же + «МР» | `fmtMoney(72.1)` → `72,10 МР` |
| `fmtPercent(n, digits?)` | число + «%» | `fmtPercent(3.4)` → `3,4%` |
| `fmtCompact(n)` | компактно: тыс/млн/млрд | `fmtCompact(12500)` → `12,5 тыс` |
| `round(n, digits?)` | округление | `round(3.14159, 2)` → `3.14` |
| `clamp(v, min, max)` | ограничение диапазоном | `clamp(150, 0, 100)` → `100` |
| `lerp(a, b, t)` | линейная интерполяция | `lerp(0, 10, 0.5)` → `5` |
| `random(min?, max?)` | случайное число в диапазоне | `random(1, 6)` |
| `sum(values)` | сумма массива | `sum([1, 2, 3])` → `6` |
| `mean(values)` | среднее | `mean([1, 2, 3])` → `2` |
| `median(values)` | медиана | `median([1, 2, 100])` → `2` |

## Дата и время (вход — timestamp в миллисекундах)

| Функция | Пример |
| --- | --- |
| `fmtDate(ts)` | `12.08.2026` |
| `fmtTime(ts)` | `14:05` |
| `fmtDateTime(ts)` | `12.08.2026 14:05` |

## Массивы

| Функция | Описание | Пример |
| --- | --- | --- |
| `chunk(arr, size)` | разбить на куски | `chunk([1,2,3,4], 2)` → `[[1,2],[3,4]]` |
| `unique(arr)` | уникальные значения | `unique([1,1,2])` → `[1,2]` |
| `last(arr)` | последний элемент | `last([1,2,3])` → `3` |
| `range(from, to?)` | `range(3)` → `[0,1,2]`, `range(2,4)` → `[2,3,4]` |
| `groupBy(arr, key)` | группировка (ключ или функция) | `groupBy(users, 'city')` |
| `sortBy(arr, key, desc?)` | сортировка (ключ или функция) | `sortBy(items, 'price', true)` |

## Строки

| Функция | Описание | Пример |
| --- | --- | --- |
| `capitalize(s)` | первая буква заглавная | `capitalize('маннру')` → `Маннру` |
| `truncate(s, n)` | обрезать до n символов с «…» | `truncate('длинный текст', 7)` → `длинный…` |
| `pad(n, width, char?)` | дополнить до длины | `pad(7, 3)` → `007` |
| `slugify(s)` | транслит-слаг | `slugify('Курс Маннкоина!')` → `kurs-mannkoina` |

## Разное

| Функция | Описание | Пример |
| --- | --- | --- |
| `uid(length?)` | случайный id (a-z, 0-9) | `uid(6)` → `k3x9qp` |
| `sleep(ms)` | пауза (Promise) | `await utils.sleep(500)` |
| `deepClone(v)` | JSON-копия значения | `deepClone({ a: 1 })` |
| `pick(obj, keys)` | взять только ключи | `pick(user, ['name', 'xp'])` |
| `omit(obj, keys)` | исключить ключи | `omit(user, ['password'])` |

---

## Пример

```js
render(ctx) {
  const profit = ctx.utils.sum([10, 20, 30])
  const top = ctx.utils.last(ctx.state.history ?? [])
  return '<b>Профит:</b> ' + ctx.utils.fmtMoney(profit) +
    '<br>Последнее: ' + ctx.utils.fmtDateTime(top)
}
```


---

## Живой пример

```js
return {
  деньги: ctx.utils.fmtMoney(1234.5),
  проценты: ctx.utils.fmtPercent(3.4),
  компактно: ctx.utils.fmtCompact(1250000),
  дата: ctx.utils.fmtDateTime(Date.now()),
  медиана: ctx.utils.median([1, 2, 100]),
  сумма: ctx.utils.sum([10, 20, 30])
}
```
