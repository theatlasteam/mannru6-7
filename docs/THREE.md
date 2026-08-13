# Маннру 3D — рендеринг Three.js в плагинах

Встроенная зависимость `ctx.three` — полноценный 3D-рендеринг на Three.js
для таб-плагинов. Three.js загружается лениво при первом вызове `create()`.

```js
const manifest = {
  name: '3D-сцена',
  type: 'tab',
  dependencies: ['three']
}
```

Доступна только в таб-плагинах (нужен реальный DOM и WebGL).
Камнем преткновения не будет: сцена рисуется в ваш `<canvas>`.

---

## Быстрый старт

```js
const component = {
  data() { return {} },
  async mounted() {
    this.view = await this.$ctx.three.create(this.$refs.stage)
    this.cube = this.view.box({ size: 1.2, color: 0x9de258, position: [0, 0.6, 0] })
    this.view.loop((dt) => {
      this.cube.rotation.y += dt * 0.8
    })
  },
  beforeUnmount() {
    this.view?.dispose()
  },
  template: '<canvas ref="stage" style="width:100%;height:420px;display:block"></canvas>'
}
```

Камера по умолчанию — `[4, 3, 5]`, свет уже настроен (Ambient + Directional),
управление — орбитальная камера (вращение мышью, зум колесом). Сцена
автоматически подстраивается под размер родителя.

## Фигуры

| Метод | Опции | Примечание |
| --- | --- | --- |
| `box({ size? \| width?, height?, depth? })` | куб/параллелепипед | |
| `sphere({ radius?, segments? })` | сфера | |
| `torus({ radius?, tube?, segments? })` | бублик | |
| `cone({ radius?, height?, segments? })` | конус | |
| `cylinder({ radiusTop?, radiusBottom?, height? })` | цилиндр | |
| `plane({ width?, height? })` | плоскость (лежит на XZ) | |
| `points({ count?, spread?, size?, color? })` | облако частиц | |

Общие опции всех фигур:

```js
{
  color: 0x9de258,              // цвет (hex-число или '#rrggbb')
  position: [x, y, z],          // позиция
  rotation: [x, y, z],          // вращение в радианах
  scale: 1.5,                   // или [x, y, z]
  wireframe: false,
  emissive: 0x000000,           // свечение
  opacity: 1
}
```

Возвращают объект Three.js Mesh — можно менять `mesh.position`, `mesh.rotation`,
`mesh.scale` прямо в `loop()`.

## Сцена и свет

```js
view.background(0x121212)                          // фон
view.ambient({ color: 0xffffff, intensity: 0.7 }) // общий свет
view.pointLight({ color: 0xff6b6b, intensity: 1.2, position: [2, 4, 3] })
view.directionalLight({ color: 0xffffff, intensity: 1.2, position: [5, 8, 6] })
view.setCamera({ position: [6, 4, 6], fov: 50 })  // камера
```

## Управление и события

```js
view.loop((delta, elapsed) => { ... })   // каждый кадр; вернёт { stop() }
view.onClick((mesh) => { ... })          // клик по фигуре (или null); вернёт { stop() }
view.capture()                           // скриншот → dataURL (PNG)
view.dispose()                           // освободить WebGL (в beforeUnmount!)
```

`view.scene`, `view.camera`, `view.renderer`, `view.controls` доступны напрямую
для продвинутых сценариев (например, `view.controls.autoRotate = true`).

---

## Пример: казино-башня

```js
const manifest = { name: 'Башня', type: 'tab', dependencies: ['three'] }

const component = {
  async mounted() {
    this.view = await this.$ctx.three.create(this.$refs.stage)
    this.view.background(0x101418)
    const colors = [0x9de258, 0x64b5f6, 0xffb74d, 0xef5350]
    this.blocks = []
    for (let i = 0; i < 12; i++) {
      this.blocks.push(this.view.box({
        size: 1,
        color: colors[i % colors.length],
        position: [0, i * 1.1 - 5, 0]
      }))
    }
    this.view.loop((dt, t) => {
      this.blocks.forEach((block, i) => {
        block.rotation.y = t * 0.5 + i * 0.6
      })
    })
    this.view.onClick((mesh) => {
      if (mesh) this.$ctx.snackbar('Клик по башне!')
    })
  },
  beforeUnmount() { this.view?.dispose() },
  template: '<canvas ref="stage" style="width:100%;height:460px;display:block"></canvas>'
}
```
