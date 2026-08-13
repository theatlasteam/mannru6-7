import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'
import { md2 } from 'vuetify/blueprints'
import { mannruThemes } from './utils/vuetify-theme'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    'vuetify-nuxt-module'
  ],

  components: [
    { path: '~~/components', pathPrefix: false }
  ],

  imports: {
    dirs: ['~~/composables']
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css', '~/assets/css/cards.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
      host: '0.0.0.0'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  vuetify: {
    moduleOptions: {
      importComposables: ['useTheme']
    },
    vuetifyOptions: {
      blueprint: md2,
      theme: {
        defaultTheme: 'mannruLight',
        themes: mannruThemes
      },
      icons: {
        defaultSet: 'md',
        sets: [{
          name: 'md',
          cdn: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,GRAD,opsz,wght@0,0,20..48,400&display=swap'
        }]
      }
    }
  }
})
