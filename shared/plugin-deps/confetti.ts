/* Mannru Confetti — праздничный дождь из конфетти для плагинов.
 * Чистый канвас без зависимостей: поверх всего интерфейса появляется
 * прозрачный слой, анимируется и сам удаляется. Работает в GUI-окнах
 * и таб-плагинах. */

export type ConfettiOptions = {
  count?: number
  colors?: (number | string)[]
  duration?: number
}

const DEFAULT_COLORS = ['#9DE258', '#64B5F6', '#FFB74D', '#EF5350', '#AB47BC', '#FFD54F', '#FFFFFF']

export function createConfettiClient() {
  const spawn = (options: ConfettiOptions = {}) => {
    const colors = options.colors ?? DEFAULT_COLORS
    const count = Math.max(10, Math.min(600, options.count ?? 120))
    const duration = Math.max(800, options.duration ?? 2800)

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;'
    document.body.appendChild(canvas)

    const context = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    context.scale(dpr, dpr)

    const width = window.innerWidth
    const height = window.innerHeight
    const particles: {
      x: number, y: number, vx: number, vy: number
      rot: number, vr: number, color: string, size: number, circle: boolean
    }[] = []

    for (let index = 0; index < count; index++) {
      particles.push({
        x: Math.random() * width,
        y: -20 - Math.random() * height * 0.25,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 1.8 + Math.random() * 3.6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        size: 5 + Math.random() * 7,
        circle: Math.random() < 0.35
      })
    }

    let rafId = 0
    const start = performance.now()

    const tick = () => {
      if (performance.now() - start > duration) {
        canvas.remove()
        return
      }
      context.clearRect(0, 0, width, height)
      let alive = 0
      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.055 /* гравитация */
        particle.rot += particle.vr
        if (particle.y > height + 20) {
          continue
        }
        alive++
        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(particle.rot)
        context.fillStyle = particle.color
        if (particle.circle) {
          context.beginPath()
          context.arc(0, 0, particle.size / 2, 0, Math.PI * 2)
          context.fill()
        } else {
          context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
        }
        context.restore()
      }
      if (alive === 0) {
        canvas.remove()
        return
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    /* один взрыв конфетти */
    burst(options?: ConfettiOptions) {
      spawn(options)
    },
    /* непрерывный дождь несколько секунд */
    rain(options: ConfettiOptions = {}) {
      const duration = Math.max(800, options.duration ?? 2500)
      const timer = setInterval(() => {
        spawn({ ...options, count: Math.min(60, Math.floor((options.count ?? 40) / 2)) })
      }, 220)
      setTimeout(() => clearInterval(timer), duration)
    }
  }
}

export type MannruConfetti = ReturnType<typeof createConfettiClient>
