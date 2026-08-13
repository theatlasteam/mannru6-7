/* Mannru Charts — built-in SVG chart engine for plugins.
 * Pure string building: returns { svg(): string } markup that can be
 * embedded into GUI windows (v-html) and tab plugins. Colors follow
 * the app theme automatically via currentColor / CSS variables. */

type Point = number | null

type LineOpts = {
  data: Point[]
  labels?: string[]
  width?: number
  height?: number
  fill?: boolean
}

type BarOpts = {
  data: number[]
  labels?: string[]
  width?: number
  height?: number
}

type CandleItem = [number, number, number, number] | { o: number, h: number, l: number, c: number }

type CandleOpts = {
  data: CandleItem[]
  labels?: string[]
  width?: number
  height?: number
  up?: string
  down?: string
}

type PieOpts = {
  data: number[]
  labels?: string[]
  width?: number
  height?: number
  colors?: string[]
  donut?: boolean
}

const PALETTE = ['#7c4dff', '#26c6da', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc', '#ec407a', '#26a69a']
const PADDING = { top: 10, right: 12, bottom: 20, left: 44 }

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

function compact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e6) return (value / 1e6).toFixed(1).replace('.', ',') + 'м'
  if (abs >= 1e3) return (value / 1e3).toFixed(1).replace('.', ',') + 'к'
  if (abs >= 100) return Math.round(value).toString()
  if (abs >= 1) return value.toFixed(1).replace('.', ',')
  return value.toFixed(2).replace('.', ',')
}

function wrapSvg(inner: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;width:100%;height:auto;color:rgb(var(--v-theme-primary));font:11px/1.4 system-ui,-apple-system,sans-serif" role="img">${inner}</svg>`
}

function gridLines(values: number[], min: number, max: number, top: number, plotHeight: number, plotWidth: number): string {
  const ticks = Math.min(values.length, 4)
  let markup = ''
  for (let index = 0; index < ticks; index++) {
    const ratio = index / (ticks - 1)
    const value = max - ratio * (max - min)
    const y = top + ratio * plotHeight
    const label = Math.abs(value) < 0.01 ? '0' : compact(value)
    markup += `<line x1="${PADDING.left}" y1="${y.toFixed(1)}" x2="${PADDING.left + plotWidth}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/><text x="${PADDING.left - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="currentColor" opacity="0.65">${label}</text>`
  }
  return markup
}

export const mannruCharts = {
  line(options: LineOpts) {
    const width = options.width ?? 320
    const height = options.height ?? 180
    const values = options.data.map(toNumber)
    const finite = values.filter(value => !Number.isNaN(value))
    if (finite.length < 2) {
      return { svg: () => wrapSvg('<text x="50%" y="50%" text-anchor="middle" fill="currentColor" opacity="0.5">нет данных</text>', width, height) }
    }
    const rawMin = Math.min(...finite)
    const rawMax = Math.max(...finite)
    const span = rawMax - rawMin || 1
    const min = rawMin - span * 0.12
    const max = rawMax + span * 0.12
    const plotWidth = width - PADDING.left - PADDING.right
    const plotHeight = height - PADDING.top - PADDING.bottom
    const xOf = (index: number) => (PADDING.left + (index / (values.length - 1)) * plotWidth).toFixed(1)
    const yOf = (value: number) => (PADDING.top + (1 - (value - min) / (max - min)) * plotHeight).toFixed(1)

    const points = values.map((value, index) => Number.isNaN(value) ? '' : `${xOf(index)},${yOf(value)}`).filter(Boolean).join(' ')
    const area = `${PADDING.left},${PADDING.top + plotHeight} ${points} ${PADDING.left + plotWidth},${PADDING.top + plotHeight}`
    const grid = gridLines(finite, min, max, PADDING.top, plotHeight, plotWidth)

    let markup = grid
    if (options.fill !== false && points) {
      markup += `<polygon points="${area}" fill="currentColor" opacity="0.12"/>`
    }
    if (points) {
      markup += `<polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      values.forEach((value, index) => {
        if (Number.isNaN(value)) return
        markup += `<circle cx="${xOf(index)}" cy="${yOf(value)}" r="2.2" fill="currentColor"/>`
      })
    }
    const labels = options.labels ?? []
    if (labels.length >= 2) {
      for (const index of [0, labels.length - 1]) {
        markup += `<text x="${xOf(index)}" y="${height - 6}" text-anchor="${index === 0 ? 'start' : 'end'}" fill="currentColor" opacity="0.65">${escapeHtml(labels[index])}</text>`
      }
    }
    return { svg: () => wrapSvg(markup, width, height) }
  },

  bar(options: BarOpts) {
    const width = options.width ?? 320
    const height = options.height ?? 180
    const values = options.data.map(toNumber)
    if (values.length === 0) {
      return { svg: () => wrapSvg('<text x="50%" y="50%" text-anchor="middle" fill="currentColor" opacity="0.5">нет данных</text>', width, height) }
    }
    const rawMax = Math.max(...values.map(value => Number.isNaN(value) ? 0 : value), 0)
    const max = rawMax * 1.1 || 1
    const plotWidth = width - PADDING.left - PADDING.right
    const plotHeight = height - PADDING.top - PADDING.bottom
    const slot = plotWidth / values.length
    const barWidth = Math.max(1, slot * 0.62)
    const grid = gridLines(values, 0, max, PADDING.top, plotHeight, plotWidth)

    let markup = grid
    values.forEach((value, index) => {
      if (Number.isNaN(value)) return
      const x = (PADDING.left + index * slot + (slot - barWidth) / 2).toFixed(1)
      const y = (PADDING.top + (1 - value / max) * plotHeight).toFixed(1)
      const bottom = (PADDING.top + plotHeight).toFixed(1)
      markup += `<rect x="${x}" y="${y}" width="${barWidth.toFixed(1)}" height="${Math.max(0, Number(bottom) - Number(y)).toFixed(1)}" rx="2" fill="currentColor"/>`
    })
    const labels = options.labels ?? []
    if (labels.length > 0) {
      const step = Math.max(1, Math.ceil(labels.length / 8))
      values.forEach((value, index) => {
        if (index % step !== 0) return
        markup += `<text x="${(PADDING.left + index * slot + slot / 2).toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="currentColor" opacity="0.65">${escapeHtml(labels[index])}</text>`
      })
    }
    return { svg: () => wrapSvg(markup, width, height) }
  },

  candle(options: CandleOpts) {
    const width = options.width ?? 340
    const height = options.height ?? 200
    const items = options.data.map(item => Array.isArray(item) ? ({ o: item[0], h: item[1], l: item[2], c: item[3] }) : item).map(({ o, h, l, c }) => ({ o: toNumber(o), h: toNumber(h), l: toNumber(l), c: toNumber(c) }))
    const finite = items.filter(item => !Number.isNaN(item.o + item.h + item.l + item.c))
    if (finite.length === 0) {
      return { svg: () => wrapSvg('<text x="50%" y="50%" text-anchor="middle" fill="currentColor" opacity="0.5">нет данных</text>', width, height) }
    }
    const min = Math.min(...finite.map(item => item.l))
    const max = Math.max(...finite.map(item => item.h))
    const span = max - min || 1
    const yMin = min - span * 0.06
    const yMax = max + span * 0.06
    const plotWidth = width - PADDING.left - PADDING.right
    const plotHeight = height - PADDING.top - PADDING.bottom
    const slot = plotWidth / items.length
    const bodyWidth = Math.max(2, slot * 0.55)
    const yOf = (value: number) => PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight
    const up = options.up ?? '#22c55e'
    const down = options.down ?? '#ef4444'

    let markup = gridLines(finite.map(item => item.h), yMin, yMax, PADDING.top, plotHeight, plotWidth)
    items.forEach((item, index) => {
      if (Number.isNaN(item.o + item.h + item.l + item.c)) return
      const center = PADDING.left + index * slot + slot / 2
      const isUp = item.c >= item.o
      const color = isUp ? up : down
      const bodyTop = Math.min(yOf(item.o), yOf(item.c)).toFixed(1)
      const bodyBottom = Math.max(yOf(item.o), yOf(item.c)).toFixed(1)
      const bodyHeight = Math.max(0.8, Number(bodyBottom) - Number(bodyTop))
      markup += `<line x1="${center.toFixed(1)}" y1="${yOf(item.h).toFixed(1)}" x2="${center.toFixed(1)}" y2="${yOf(item.l).toFixed(1)}" stroke="${color}" stroke-width="1"/>`
      markup += `<rect x="${(center - bodyWidth / 2).toFixed(1)}" y="${bodyTop}" width="${bodyWidth.toFixed(1)}" height="${bodyHeight.toFixed(1)}" fill="${color}"/>`
    })
    const labels = options.labels ?? []
    if (labels.length >= 2) {
      const step = Math.max(1, Math.ceil(labels.length / 6))
      items.forEach((item, index) => {
        if (index % step !== 0) return
        markup += `<text x="${(PADDING.left + index * slot + slot / 2).toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="currentColor" opacity="0.65">${escapeHtml(labels[index])}</text>`
      })
    }
    return { svg: () => wrapSvg(markup, width, height) }
  },

  pie(options: PieOpts) {
    const width = options.width ?? 260
    const height = options.height ?? 180
    const values = options.data.map(toNumber)
    const total = values.reduce((acc, value) => acc + (Number.isNaN(value) ? 0 : value), 0)
    if (total <= 0) {
      return { svg: () => wrapSvg('<text x="50%" y="50%" text-anchor="middle" fill="currentColor" opacity="0.5">нет данных</text>', width, height) }
    }
    const colors = options.colors ?? PALETTE
    const radius = Math.min(width - PADDING.left - PADDING.right, height - PADDING.bottom) / 2 - 4
    const centerX = PADDING.left + radius + 4
    const centerY = (height + PADDING.top - PADDING.bottom) / 2
    const innerRadius = options.donut ? radius * 0.58 : 0

    const polar = (angle: number, radiusValue: number) => {
      const rad = (angle - 90) * Math.PI / 180
      return { x: centerX + radiusValue * Math.cos(rad), y: centerY + radiusValue * Math.sin(rad) }
    }

    let markup = ''
    let angle = 0
    const arcs: { from: number, to: number, color: string, label: string }[] = []
    values.forEach((value, index) => {
      if (Number.isNaN(value) || value <= 0) return
      const sweep = value / total * 360
      arcs.push({ from: angle, to: angle + sweep, color: colors[index % colors.length], label: compact(value) })
      angle += sweep
    })

    arcs.forEach((arc) => {
      const start = polar(arc.from, radius)
      const end = polar(arc.to, radius)
      const largeArc = arc.to - arc.from > 180 ? 1 : 0
      if (innerRadius > 0) {
        const startInner = polar(arc.from, innerRadius)
        const endInner = polar(arc.to, innerRadius)
        markup += `<path d="M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 ${largeArc} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)} L ${endInner.x.toFixed(1)} ${endInner.y.toFixed(1)} A ${innerRadius.toFixed(1)} ${innerRadius.toFixed(1)} 0 ${largeArc} 0 ${startInner.x.toFixed(1)} ${startInner.y.toFixed(1)} Z" fill="${arc.color}"/>`
      } else {
        markup += `<path d="M ${centerX.toFixed(1)} ${centerY.toFixed(1)} L ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 ${largeArc} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)} Z" fill="${arc.color}"/>`
      }
      if (innerRadius > 0 && arc.to - arc.from > 20) {
        const mid = polar(arc.from + (arc.to - arc.from) / 2, (radius + innerRadius) / 2)
        markup += `<text x="${mid.x.toFixed(1)}" y="${(mid.y + 3).toFixed(1)}" text-anchor="middle" fill="#fff" font-weight="600" font-size="10">${arc.label}</text>`
      }
    })
    if (innerRadius > 0) {
      markup += `<circle cx="${centerX.toFixed(1)}" cy="${centerY.toFixed(1)}" r="${innerRadius.toFixed(1)}" fill="rgb(var(--v-theme-surface))"/>`
      markup += `<text x="${centerX.toFixed(1)}" y="${(centerY + 4).toFixed(1)}" text-anchor="middle" fill="currentColor" font-weight="700">${compact(total)}</text>`
    }

    const labels = options.labels ?? []
    if (labels.length > 0) {
      let legendY = PADDING.top + 8
      arcs.forEach((arc, index) => {
        const label = labels[index] ?? ''
        markup += `<rect x="${width - 92}" y="${legendY - 9}" width="9" height="9" rx="2" fill="${arc.color}"/><text x="${width - 78}" y="${legendY}" fill="currentColor" opacity="0.85">${escapeHtml(label)}</text>`
        legendY += 15
      })
    }
    return { svg: () => wrapSvg(markup, width, height) }
  }
}

export type MannruCharts = typeof mannruCharts
