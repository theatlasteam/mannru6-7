<script setup lang="ts">
/* Loading state — pixel-grid loader.
 * Drive: square cells, chevron wavefront. Dots: round cells. Orbit: comet.
 * Paired with a shimmering label and a live elapsed timer. */

const props = withDefaults(
  defineProps<{
    label?: string
    variant?: 'Drive' | 'Dots' | 'Orbit'
  }>(),
  { label: 'Крутим шестерёнки', variant: 'Drive' }
)

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3)
  const c = i % 3
  return (c + Math.abs(r - 1)) * 90
})

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3]
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i)
  return k === -1 ? null : k * 110
})

const patterns = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false }
}

const current = computed(() => patterns[props.variant] ?? patterns.Drive)

const tenths = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => {
    tenths.value += 1
  }, 100)
})

onUnmounted(() => {
  clearInterval(timer)
})

const elapsed = computed(() => {
  const total = tenths.value / 10
  if (total < 60) {
    return `${total.toFixed(1)}s`
  }
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`
})
</script>

<template>
  <div class="mannru-loading">
    <span
      class="mannru-loading__grid"
      aria-hidden="true"
    >
      <span
        v-for="(delay, index) in current.delays"
        :key="index"
        class="mannru-loading__cell"
        :class="{ 'mannru-loading__cell--round': current.round }"
        :style="{
          opacity: delay === null ? 0.07 : 0.15,
          animation: delay === null ? 'none' : `pixel-on ${current.dur}ms ease-in-out ${delay}ms infinite`
        }"
      />
    </span>
    <span class="mannru-loading__label">{{ label }}</span>
    <span class="mannru-loading__timer">{{ elapsed }}</span>
  </div>
</template>

<style scoped>
.mannru-loading {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
}

.mannru-loading__grid {
  display: grid;
  grid-template-columns: repeat(3, 4px);
  gap: 1.5px;
}

.mannru-loading__cell {
  width: 4px;
  height: 4px;
  border-radius: 1px;
  background: var(--ink);
}

.mannru-loading__cell--round {
  border-radius: 50%;
}

.mannru-loading__label {
  background-image: linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%);
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  animation: shimmer-text 1.4s linear infinite;
  color: transparent;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.mannru-loading__timer {
  font-family: monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--ink-3);
}
</style>
