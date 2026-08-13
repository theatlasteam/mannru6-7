/* Mannru 3D — рендеринг Three.js для таб-плагинов.
 * Клиентская зависимость: three загружается динамически при первом create()
 * (на сервере модуль не тянет тяжёлый WebGL-бандл). */

export type ShapeOptions = {
  color?: number | string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  wireframe?: boolean
  emissive?: number | string
  opacity?: number
}

export type BoxOptions = ShapeOptions & { size?: number, width?: number, height?: number, depth?: number }
export type SphereOptions = ShapeOptions & { radius?: number, segments?: number }
export type TorusOptions = ShapeOptions & { radius?: number, tube?: number, segments?: number }
export type ConeOptions = ShapeOptions & { radius?: number, height?: number, segments?: number }
export type CylinderOptions = ShapeOptions & { radiusTop?: number, radiusBottom?: number, height?: number, segments?: number }
export type PlaneOptions = ShapeOptions & { width?: number, height?: number }
export type PointsOptions = { count?: number, spread?: number, color?: number | string, size?: number, position?: [number, number, number] }
export type LightOptions = { color?: number | string, intensity?: number, position?: [number, number, number] }
export type CameraOptions = { position?: [number, number, number], fov?: number }

export function createThreeClient() {
  return {
    async create(canvas: HTMLCanvasElement, options: CameraOptions = {}) {
      const [THREE, { OrbitControls }] = await Promise.all([
        import('three') as Promise<typeof import('three')>,
        import('three/examples/jsm/controls/OrbitControls.js') as Promise<typeof import('three/examples/jsm/controls/OrbitControls.js')>
      ])

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(options.fov ?? 60, 1, 0.1, 1000)
      camera.position.set(...(options.position ?? [4, 3, 5]))
      camera.lookAt(0, 0, 0)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08

      /* свет по умолчанию, чтобы объекты были видны сразу */
      scene.add(new THREE.AmbientLight(0xffffff, 0.7))
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4)
      keyLight.position.set(5, 8, 6)
      scene.add(keyLight)

      let disposed = false
      let width = 0
      let height = 0
      let lastWidth = 0
      let lastHeight = 0

      const resize = () => {
        const parent = canvas.parentElement
        if (!parent) {
          return
        }
        width = Math.max(60, parent.clientWidth)
        height = Math.max(60, parent.clientHeight)
        if (width === lastWidth && height === lastHeight) {
          return
        }
        lastWidth = width
        lastHeight = height
        /* updateStyle=true фиксирует CSS-размер холста — без него цикл:
         * атрибут меняет layout-высоту, родитель растёт, ResizeObserver снова... */
        renderer.setSize(width, height, true)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.render(scene, camera)
      }
      const observer = new ResizeObserver(resize)
      if (canvas.parentElement) {
        observer.observe(canvas.parentElement)
      }

      const loopCallbacks = new Set<(delta: number, elapsed: number) => void>()
      let lastTime = performance.now()
      let elapsed = 0

      const tick = () => {
        if (disposed) {
          return
        }
        const now = performance.now()
        const delta = Math.min(0.05, (now - lastTime) / 1000)
        lastTime = now
        elapsed += delta
        for (const callback of loopCallbacks) {
          callback(delta, elapsed)
        }
        controls.update()
        renderer.render(scene, camera)
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      resize()

      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      const pickables = new Set<THREE.Object3D>()

      const onPointer = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        const hits = raycaster.intersectObjects([...pickables], false)
        for (const onClick of clickHandlers) {
          onClick(hits[0]?.object ?? null)
        }
      }
      const clickHandlers = new Set<(mesh: unknown | null) => void>()
      canvas.addEventListener('click', onPointer)

      const material = (color: number | string | undefined, extra: ShapeOptions) => new THREE.MeshStandardMaterial({
        color: color ?? 0x9de258,
        emissive: extra.emissive ?? 0x000000,
        wireframe: extra.wireframe ?? false,
        transparent: (extra.opacity ?? 1) < 1,
        opacity: extra.opacity ?? 1
      })

      const place = (mesh: THREE.Mesh, extra: ShapeOptions) => {
        if (extra.position) {
          mesh.position.set(...extra.position)
        }
        if (extra.rotation) {
          mesh.rotation.set(...extra.rotation)
        }
        if (extra.scale !== undefined) {
          const scale = typeof extra.scale === 'number' ? extra.scale : undefined
          if (scale !== undefined) {
            mesh.scale.setScalar(scale)
          } else {
            mesh.scale.set(...(extra.scale as [number, number, number]))
          }
        }
        scene.add(mesh)
        pickables.add(mesh)
        return mesh
      }

      return {
        scene,
        camera,
        renderer,
        controls,
        box(options: BoxOptions = {}) {
          const width = options.width ?? options.size ?? 1
          const height = options.height ?? options.size ?? 1
          const depth = options.depth ?? options.size ?? 1
          return place(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(options.color, options)), options)
        },
        sphere(options: SphereOptions = {}) {
          const radius = options.radius ?? 0.8
          const segments = options.segments ?? 32
          return place(new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments), material(options.color, options)), options)
        },
        torus(options: TorusOptions = {}) {
          const radius = options.radius ?? 1
          const tube = options.tube ?? 0.3
          const segments = options.segments ?? 24
          return place(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 16, segments), material(options.color, options)), options)
        },
        cone(options: ConeOptions = {}) {
          const radius = options.radius ?? 0.8
          const height = options.height ?? 1.6
          const segments = options.segments ?? 32
          return place(new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material(options.color, options)), options)
        },
        cylinder(options: CylinderOptions = {}) {
          const radiusTop = options.radiusTop ?? options.radiusBottom ?? 0.6
          const radiusBottom = options.radiusBottom ?? radiusTop
          const height = options.height ?? 1.4
          const segments = options.segments ?? 32
          return place(new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material(options.color, options)), options)
        },
        plane(options: PlaneOptions = {}) {
          const width = options.width ?? 4
          const height = options.height ?? 4
          const mesh = place(new THREE.Mesh(new THREE.PlaneGeometry(width, height), material(options.color, options)), options)
          mesh.rotation.x = -Math.PI / 2
          return mesh
        },
        points(options: PointsOptions = {}) {
          const count = options.count ?? 400
          const spread = options.spread ?? 6
          const positions = new Float32Array(count * 3)
          for (let index = 0; index < count * 3; index++) {
            positions[index] = (Math.random() - 0.5) * spread
          }
          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
          const points = new THREE.Points(geometry, new THREE.PointsMaterial({
            color: options.color ?? 0xffffff,
            size: options.size ?? 0.05
          }))
          if (options.position) {
            points.position.set(...options.position)
          }
          scene.add(points)
          return points
        },
        background(color: number | string) {
          scene.background = new THREE.Color(color)
        },
        ambient(options: LightOptions = {}) {
          return scene.add(new THREE.AmbientLight(options.color ?? 0xffffff, options.intensity ?? 0.7))
        },
        pointLight(options: LightOptions = {}) {
          const light = new THREE.PointLight(options.color ?? 0xffffff, options.intensity ?? 1.2, 50)
          light.position.set(...(options.position ?? [2, 4, 3]))
          scene.add(light)
          return light
        },
        directionalLight(options: LightOptions = {}) {
          const light = new THREE.DirectionalLight(options.color ?? 0xffffff, options.intensity ?? 1.2)
          light.position.set(...(options.position ?? [5, 8, 6]))
          scene.add(light)
          return light
        },
        setCamera(options: CameraOptions = {}) {
          if (options.position) {
            camera.position.set(...options.position)
          }
          if (options.fov) {
            camera.fov = options.fov
            camera.updateProjectionMatrix()
          }
          camera.lookAt(0, 0, 0)
        },
        loop(callback: (delta: number, elapsed: number) => void) {
          loopCallbacks.add(callback)
          return { stop: () => loopCallbacks.delete(callback) }
        },
        onClick(callback: (mesh: unknown | null) => void) {
          clickHandlers.add(callback)
          return { stop: () => clickHandlers.delete(callback) }
        },
        capture(): string {
          renderer.render(scene, camera)
          return renderer.domElement.toDataURL('image/png')
        },
        dispose() {
          disposed = true
          observer.disconnect()
          canvas.removeEventListener('click', onPointer)
          controls.dispose()
          renderer.dispose()
          loopCallbacks.clear()
          clickHandlers.clear()
        }
      }
    }
  }
}

export type MannruThree = ReturnType<typeof createThreeClient>
