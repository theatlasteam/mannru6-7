declare module '*?raw' {
  const content: string
  export default content
}

declare module 'vue/dist/vue.esm-bundler.js' {
  export * from 'vue'
}
