/* Mannru Timer — время и таймеры для плагинов.
 * interval/timeout/countdown возвращают управляемые хендлы со stop()/cancel() —
 * ничего не течёт, всё можно остановить в beforeUnmount. */
import { mannruUtils } from './utils'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export const mannruTimer = {
  now(): number {
    return Date.now()
  },
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)))
  },
  delay(ms: number): Promise<void> {
    return mannruTimer.sleep(ms)
  },
  timeout(callback: () => void, ms: number): { cancel(): void } {
    const id = setTimeout(callback, Math.max(0, ms))
    return { cancel: () => clearTimeout(id) }
  },
  interval(callback: () => void, ms: number): { stop(): void } {
    const id = setInterval(callback, Math.max(1, ms))
    return { stop: () => clearInterval(id) }
  },
  /* обратный отсчёт: onTick(remainingMs) каждую секунду, onDone в конце */
  countdown(seconds: number, onTick: (remaining: number) => void, onDone?: () => void): { stop(): void } {
    let remaining = Math.max(0, Math.floor(seconds))
    onTick(remaining)
    const id = setInterval(() => {
      remaining--
      if (remaining <= 0) {
        clearInterval(id)
        onTick(0)
        onDone?.()
      } else {
        onTick(remaining)
      }
    }, 1000)
    return { stop: () => clearInterval(id) }
  },
  /* секундомер */
  stopwatch(): { start(): void, stop(): number, elapsed(): number } {
    let startTime = 0
    let accumulated = 0
    let running = false
    return {
      start() {
        if (!running) {
          running = true
          startTime = Date.now()
        }
      },
      stop(): number {
        if (running) {
          accumulated += Date.now() - startTime
          running = false
        }
        return accumulated
      },
      elapsed(): number {
        return accumulated + (running ? Date.now() - startTime : 0)
      }
    }
  },
  /* форматирование */
  fmtDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      return `${hours} ч ${pad(minutes)} мин`
    }
    if (minutes > 0) {
      return `${minutes} мин ${pad(seconds)} с`
    }
    return `${seconds} с`
  },
  fmtCountdown(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${pad(minutes)}:${pad(seconds)}`
  },
  fmtTime(timestamp: number): string {
    /* дата/время из utils + секунды */
    const date = new Date(timestamp)
    return `${mannruUtils.fmtTime(timestamp)}:${pad(date.getSeconds())}`
  },
  timestamp(): string {
    return mannruTimer.fmtTime(Date.now())
  }
}

export type MannruTimer = typeof mannruTimer
