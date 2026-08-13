<script setup lang="ts">
const props = defineProps<{ text: string }>()

const container = ref<HTMLElement>()

const PIXEL = 3
const DESCENDER = 0.25

function measureText(value: string, fontSize: number, weight: string) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `${weight} ${fontSize}px Roboto`
  return ctx.measureText(value).width
}

function render() {
  const host = container.value
  if (!host || !import.meta.client) {
    return
  }

  const style = getComputedStyle(host)
  const fontSize = parseFloat(style.fontSize) || 96
  const weight = style.fontWeight || '700'
  const color = style.color
  const height = Math.ceil(fontSize * (1 + DESCENDER))

  host.innerHTML = ''

  let letterIndex = 0

  const parts = props.text.split(/(\s+)/)

  parts.forEach((part) => {
    if (/^\s+$/.test(part)) {
      part.split('').forEach((letter) => {
        host.appendChild(buildLetterCanvas(letter, fontSize, weight, color, height, letterIndex++))
      })
      return
    }

    const word = document.createElement('span')
    word.className = 'pixel-word'

    part.split('').forEach((letter) => {
      word.appendChild(buildLetterCanvas(letter, fontSize, weight, color, height, letterIndex++))
    })

    host.appendChild(word)
  })
}

function buildLetterCanvas(letter: string, fontSize: number, weight: string, color: string, height: number, index: number) {
  const width = Math.ceil(measureText(letter, fontSize, weight)) + PIXEL * 2

  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.ceil(width / PIXEL))
  small.height = Math.ceil(height / PIXEL)
  const smallCtx = small.getContext('2d')!
  smallCtx.font = `${weight} ${fontSize / PIXEL}px Roboto`
  smallCtx.fillStyle = color
  smallCtx.textBaseline = 'alphabetic'
  smallCtx.fillText(letter, 0, (height - fontSize * DESCENDER) / PIXEL)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.className = 'pixel-letter'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.animationDelay = `${index * 0.11}s`

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, width, height)

  return canvas
}

function onThemeChange() {
  render()
}

onMounted(() => {
  render()
  window.addEventListener('resize', render)
  window.addEventListener('mannru-theme-change', onThemeChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', render)
  window.removeEventListener('mannru-theme-change', onThemeChange)
})
</script>

<template>
  <span
    ref="container"
    class="pixel-wave"
    :data-text="text"
    :aria-label="text"
    role="text"
  >
    <span
      v-for="(letter, index) in text.split('')"
      :key="index"
      aria-hidden="true"
      class="pixel-wave__fallback"
    >
      {{ letter }}
    </span>
  </span>
</template>

<style scoped>
.pixel-wave {
  display: inline-block;
}

.pixel-wave__fallback {
  display: inline;
}
</style>

<style>
.pixel-letter {
  display: inline-block;
  margin-right: 3px;
  animation: pixel-wave-bob 1.4s ease-in-out infinite;
  image-rendering: pixelated;
  vertical-align: -0.25em;
}

.pixel-word {
  display: inline-block;
  white-space: nowrap;
}

@keyframes pixel-wave-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-0.18em); }
}

@media (prefers-reduced-motion: reduce) {
  .pixel-letter {
    animation: none;
  }
}
</style>
