<script setup lang="ts">
import { authClient, signIn, signUp } from '~/utils/auth'

const route = useRoute()

const { data: session } = await authClient.useSession(useFetch)

if (session.value) {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  await navigateTo(redirect)
}

const mode = ref<'signin' | 'signup'>('signin')
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const emailRules = [
  (value: string) => !!value || 'Введите e-mail',
  (value: string) => /.+@.+\..+/.test(value) || 'Похоже, это не e-mail'
]

const passwordRules = [
  (value: string) => !!value || 'Введите пароль',
  (value: string) => value.length >= 8 || 'Минимум 8 символов'
]

async function submit() {
  loading.value = true
  error.value = ''

  try {
    if (mode.value === 'signin') {
      await signIn.email({ email: email.value, password: password.value })
    } else {
      await signUp.email({
        name: name.value,
        email: email.value,
        password: password.value
      })
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await navigateTo(redirect)
  } catch (cause) {
    error.value = cause instanceof Error && cause.message
      ? cause.message
      : 'Что-то пошло не так. Попробуйте ещё раз.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-row class="mx-0 min-h-[calc(100vh-76px)]">
    <v-col
      cols="12"
      md="6"
      class="d-none d-md-flex pa-0"
    >
      <v-card
        color="primary"
        rounded="0"
        class="mannru-brand-panel h-100 pa-12 d-flex flex-column justify-center"
      >
        <BayerShader />
        <div class="position-relative">
          <div class="d-flex align-center ga-3 mb-8">
            <img
              src="/logo.svg"
              alt="Маннру 6.7"
              style="width: 56px; height: 56px; border-radius: 50%"
            >
            <div>
              <div class="text-h6 font-weight-bold">
                МАННРУ 6.7
              </div>
              <div class="text-body-small">
                банк после пяти предыдущих
              </div>
            </div>
          </div>

          <h1 class="text-4xl md:text-5xl font-weight-bold">
            Финансы, которым<br>
            можно не верить.
          </h1>
          <p class="text-body-large mt-4 mb-0">
            Регистрация бесплатная. Счёт 6.7 — в подарок.
            Деньги не выдаются, но выглядят убедительно.
          </p>
        </div>
      </v-card>
    </v-col>

    <v-col
      cols="12"
      md="6"
      class="pa-0"
    >
      <v-card
        color="surface"
        rounded="0"
        class="h-100 w-100 d-flex align-center justify-center pa-6 pa-md-10"
      >
        <div
          class="w-100"
          style="max-width: 440px"
        >
          <div class="text-center d-md-none mb-6">
            <img
              src="/logo.svg"
              alt="Маннру 6.7"
              style="width: 56px; height: 56px; border-radius: 50%"
            >
          </div>

          <h2 class="text-h5 font-weight-bold mb-1">
            {{ mode === 'signin' ? 'С возвращением' : 'Новый клиент' }}
          </h2>
          <p class="text-body-small text-medium-emphasis mb-6">
            {{ mode === 'signin' ? 'Войдите, чтобы проверить свои 67 рублей' : 'Создайте счёт, который никто не забирает' }}
          </p>

          <v-tabs
            v-model="mode"
            color="primary"
            grow
            class="mb-6"
          >
            <v-tab value="signin">
              Вход
            </v-tab>
            <v-tab value="signup">
              Регистрация
            </v-tab>
          </v-tabs>

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <v-form @submit.prevent="submit">
            <v-text-field
              v-if="mode === 'signup'"
              v-model="name"
              label="Имя"
              placeholder="Как вас зовут"
              prepend-icon="person"
              class="mb-3"
              autocomplete="name"
            />

            <v-text-field
              v-model="email"
              label="E-mail"
              placeholder="you@example.ru"
              type="email"
              prepend-icon="mail"
              class="mb-3"
              :rules="emailRules"
              autocomplete="email"
            />

            <v-text-field
              v-model="password"
              label="Пароль"
              type="password"
              prepend-icon="lock"
              :rules="passwordRules"
              autocomplete="current-password"
            />

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              class="mt-6"
              :loading="loading"
            >
              {{ mode === 'signin' ? 'Войти' : 'Создать счёт' }}
            </v-btn>
          </v-form>

          <p class="text-body-small text-medium-emphasis text-center mt-6 mb-0">
            Регистрируясь, вы соглашаетесь с тем, что банк вымышленный.<br>
            Деньги вам всё равно не понадобятся.
          </p>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.mannru-brand-panel {
  position: relative;
  overflow: hidden;
}

.mannru-brand-panel::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: radial-gradient(120% 90% at 32% 42%, rgba(255, 255, 255, 0.5), transparent 62%);
}

.mannru-brand-panel::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background-image:
    repeating-conic-gradient(rgba(var(--v-theme-on-primary), 0.08) 0% 25%, transparent 0% 50%),
    repeating-conic-gradient(rgba(var(--v-theme-on-primary), 0.05) 0% 25%, transparent 0% 50%);
  background-position: 0 0, 2px 2px;
  background-size: 4px 4px, 4px 4px;
  mix-blend-mode: multiply;
  animation: dither-drift 0.9s steps(2) infinite;
}

@keyframes dither-drift {
  to {
    background-position: 2px 2px, 4px 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mannru-brand-panel::after {
    animation: none;
  }
}
</style>
