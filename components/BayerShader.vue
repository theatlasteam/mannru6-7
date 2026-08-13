<script setup lang="ts">
/* WebGL dithered shader — animated Bayer-dithered lime field. */

const canvas = ref<HTMLCanvasElement>()

const VERTEX = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAGMENT = `
precision mediump float;

uniform vec2 u_res;
uniform float u_time;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  float v = 0.78 + 0.15 * uv.y;
  v += 0.05 * sin(uv.x * 2.3 + u_time * 0.6);
  v += 0.04 * sin(uv.y * 5.0 - u_time * 0.9 + uv.x * 3.7);
  v = clamp(v, 0.0, 1.0);

  float b = bayer4(gl_FragCoord.xy + vec2(u_time * 2.0, u_time * 1.2));
  float q = step(b, v);

  vec3 lime = vec3(0.616, 0.886, 0.345);
  vec3 dark = vec3(0.055, 0.086, 0.035);
  vec3 col = mix(dark, lime, q);

  gl_FragColor = vec4(col, 1.0);
}
`

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let raf = 0
let start = 0
let resizeObserver: ResizeObserver | null = null

function compile(type: number, source: string) {
  if (!gl) {
    return null
  }
  const shader = gl.createShader(type)
  if (!shader) {
    return null
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

function resize() {
  const el = canvas.value
  if (!el || !gl) {
    return
  }
  const width = el.clientWidth || 1
  const height = el.clientHeight || 1
  if (el.width !== width || el.height !== height) {
    el.width = width
    el.height = height
  }
  gl.viewport(0, 0, width, height)
}

function tick() {
  if (!gl || !program) {
    return
  }
  resize()
  const uRes = gl.getUniformLocation(program, 'u_res')
  const uTime = gl.getUniformLocation(program, 'u_time')
  gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.uniform1f(uTime, (performance.now() - start) / 1000)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  raf = requestAnimationFrame(tick)
}

function init() {
  const el = canvas.value
  if (!el) {
    return
  }

  gl = el.getContext('webgl', { antialias: false, depth: false })
  if (!gl) {
    return
  }

  const vertex = compile(gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
  if (!vertex || !fragment) {
    return
  }

  program = gl.createProgram()
  if (!program) {
    return
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    return
  }
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  const location = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)

  resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(el)

  start = performance.now()
  tick()
}

onMounted(init)

onUnmounted(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  gl = null
})
</script>

<template>
  <canvas
    ref="canvas"
    class="bayer-canvas"
    aria-hidden="true"
  />
</template>

<style scoped>
.bayer-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
