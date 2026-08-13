<script setup lang="ts">
/* Mannru 6.7 — fake AI chatbot, floating in the top-right corner. */

const open = ref(false)
const thinking = ref(false)
const scrollArea = ref<HTMLElement>()

type Message = { role: 'bot' | 'user', text: string }

const WELCOME
  = 'Привет! Я — бот Маннру 6.7. Ваш счёт уже открыт в воображении, баланс 67 МР, начислено 6.7%. Могу рассказать про вклад «После шести» или помочь найти ваши деньги.'

const REPLIES = [
  'Счёт 6.7 открыт. Баланс 67 МР, начислено 6.7%. Возвращайтесь к нам в версии 7.0.',
  'Вклад «После шести»: 6.7% на 6.7 лет. Снятие — только в воображении. Остальное — в договоре, который мы тоже выдумали.',
  'Ваша карта «Шесть семь» готова. Кэшбэк 6.7% на всё, кроме денег. Выдача заняла от шести до семи минут.',
  'Пять предыдущих Маннру смотрят на вас с одобрением. Это официально зафиксировано в справке о воображении.',
  'Версия 6.7.0 работает стабильно. Багов нет. Кнопки «Печатать деньги» тоже нет, она в разделе «Скоро».'
]

const messages = ref<Message[]>([])
let botTimer: ReturnType<typeof setTimeout> | undefined

function scrollToBottom() {
  nextTick(() => {
    const el = scrollArea.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

function replyTo(text: string) {
  messages.value.push({ role: 'user', text })
  thinking.value = true
  scrollToBottom()

  clearTimeout(botTimer)
  botTimer = setTimeout(() => {
    thinking.value = false
    const botCount = messages.value.filter(m => m.role === 'bot').length
    messages.value.push({ role: 'bot', text: REPLIES[(botCount - 1) % REPLIES.length]! })
    scrollToBottom()
  }, 2600)
}

function openChat() {
  open.value = true
  if (messages.value.length > 0) {
    return
  }
  thinking.value = true
  botTimer = setTimeout(() => {
    thinking.value = false
    messages.value.push({ role: 'bot', text: WELCOME })
    scrollToBottom()
  }, 4800)
}

onUnmounted(() => {
  clearTimeout(botTimer)
})
</script>

<template>
  <div class="mannru-chat">
    <v-btn
      color="primary"
      elevation="8"
      size="x-large"
      icon
      class="mannru-chat__fab"
      :aria-label="open ? 'Закрыть чат' : 'Открыть чат'"
      @click="open ? (open = false) : openChat()"
    >
      <v-icon :icon="open ? 'close' : 'smart_toy'" />
    </v-btn>

    <v-card
      v-if="open"
      elevation="16"
      class="mannru-chat__panel"
    >
      <v-toolbar
        color="primary"
        density="compact"
        class="mannru-chat__header"
      >
        <v-avatar size="28">
          <img
            src="/logo.svg"
            alt="Маннру 6.7"
          >
        </v-avatar>
        <v-toolbar-title class="text-body-medium font-weight-bold">
          Маннру Бот 6.7
        </v-toolbar-title>
        <v-chip
          color="success"
          size="x-small"
        >
          онлайн
        </v-chip>
      </v-toolbar>

      <div
        ref="scrollArea"
        class="mannru-chat__body"
      >
        <div class="mannru-chat__inner">
          <div
            v-if="thinking"
            class="mannru-chat__bubble"
          >
            <MannruThinking variant="Steps" />
          </div>

          <template
            v-for="(message, index) in messages"
            :key="index"
          >
            <div
              v-if="message.role === 'user'"
              class="mannru-chat__bubble mannru-chat__bubble--user"
            >
              <v-sheet
                color="primary"
                rounded="lg"
                class="pa-3"
              >
                <p class="mannru-chat__user-text">
                  {{ message.text }}
                </p>
              </v-sheet>
            </div>
            <div
              v-else
              class="mannru-chat__bubble"
            >
              <MannruStreaming
                :text="message.text"
                :show-extras="index === 0"
                @send="replyTo"
              />
            </div>
          </template>
        </div>
      </div>

      <div class="mannru-chat__prompt">
        <MannruPromptBar @send="replyTo" />
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.mannru-chat__fab {
  position: fixed;
  z-index: 1100;
  right: 24px;
  bottom: 24px;
}

.mannru-chat__fab::after {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 9px;
  height: 9px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--green);
  content: '';
}

.mannru-chat__panel {
  position: fixed;
  z-index: 1100;
  right: 24px;
  bottom: 96px;
  display: flex;
  width: 400px;
  max-width: calc(100vw - 32px);
  height: min(600px, calc(100vh - 130px));
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
}

.mannru-chat__header .v-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mannru-chat__body {
  flex: 1;
  overflow-y: auto;
  background: var(--inset);
}

.mannru-chat__inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.mannru-chat__bubble {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
  animation: pop-in 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.mannru-chat__bubble--user {
  align-self: flex-end;
  background: transparent;
  box-shadow: none;
}

.mannru-chat__user-text {
  margin: 0;
  color: var(--accent-ink);
  font-size: 13px;
  line-height: 1.5;
}

.mannru-chat__prompt {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

@media (max-width: 600px) {
  .mannru-chat__fab {
    right: 12px;
    bottom: 12px;
  }

  .mannru-chat__panel {
    right: 12px;
    bottom: 80px;
    width: calc(100vw - 24px);
    height: calc(100vh - 100px);
  }
}
</style>
