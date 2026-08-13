/* Manncoin course — smooth random walk around 67 Маннкоин = 1 МР.
 * Deterministic by time, so every request sees a (slightly) new rate. */

export function manncoinRate(now = Date.now()) {
  const t = now / 1000
  const base = 67
  const wave = 6 * Math.sin(t / 300) + 4 * Math.sin(t / 67) + 2.5 * Math.sin(t / 17)
  return base + wave
}

export function manncoinRateChange(now = Date.now()) {
  return manncoinRate(now) - manncoinRate(now - 60 * 60 * 1000)
}

export type Candle = {
  date: number
  open: number
  high: number
  low: number
  close: number
}

/* Одна свеча за интервал [start, end]: open/close — на границах,
 * high/low — максимум/минимум функции курса внутри интервала. */
export function manncoinCandle(start: number, end: number): Candle {
  const samples = 120
  let high = -Infinity
  let low = Infinity
  for (let index = 0; index <= samples; index++) {
    const value = manncoinRate(start + ((end - start) * index) / samples)
    if (value > high) high = value
    if (value < low) low = value
  }
  return { date: start, open: manncoinRate(start), high, low, close: manncoinRate(end) }
}

/* Свеча текущего дня (с полуночи до now). */
export function manncoinOhlc(now = Date.now()): Candle {
  const dayStart = new Date(now).setHours(0, 0, 0, 0)
  return manncoinCandle(dayStart, now)
}

/* История дневных свечей: `days` штук, последняя — текущий (незакрытый) день. */
export function manncoinOhlcHistory(now = Date.now(), days = 30): Candle[] {
  const count = Math.max(1, Math.min(365, days))
  const dayStart = new Date(now).setHours(0, 0, 0, 0)
  const result: Candle[] = []
  for (let index = count - 1; index >= 1; index--) {
    result.push(manncoinCandle(dayStart - index * 86_400_000, dayStart - (index - 1) * 86_400_000))
  }
  result.push(manncoinCandle(dayStart, now))
  return result
}
