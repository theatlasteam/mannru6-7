<script setup lang="ts">
const snackbar = useSnackbar()

const snackbarVisible = computed({
  get: () => snackbar.state.value.visible,
  set: (value) => {
    snackbar.state.value.visible = value
  }
})

const snackbarColor = computed(() => {
  const type = snackbar.state.value.type
  return type === 'success' ? 'success' : type === 'error' ? 'error' : 'primary'
})

useHead({
  htmlAttrs: {
    lang: 'ru'
  },
  title: 'Маннру 6.7 — банк после пяти предыдущих',
  meta: [
    {
      name: 'description',
      content: 'Маннру 6.7 — вымышленный русский банк после пяти предыдущих Mannru. 67 рублей и ноль реальных денег.'
    },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/logo.svg' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
    }
  ]
})
</script>

<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <v-snackbar
      v-model="snackbarVisible"
      :color="snackbarColor"
      :timeout="3500"
      variant="tonal"
      rounded="pill"
      location="bottom"
    >
      {{ snackbar.state.value.text }}
      <template #actions>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="snackbar.close()"
        >
          <v-icon icon="close" />
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>
