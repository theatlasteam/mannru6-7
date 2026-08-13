<script setup lang="ts">
const metrics = [
  { value: '05', label: 'предыдущих Mannru' },
  { value: '01', label: 'текущая версия' },
  { value: '67 МР', label: 'стартовый баланс' },
  { value: '0 МР', label: 'реальных денег' }
]

const stats = [
  { label: 'Версия счёта', value: '6.7.0' },
  { label: 'Начислено', value: '+6.7%' },
  { label: 'Клиентов', value: '67 млн*' },
  { label: 'Доходность', value: '6.7 / 10' }
]

const products = [
  {
    icon: 'account_balance_wallet',
    title: 'Счёт 6.7',
    subtitle: 'Для повседневных расходов',
    rate: '67 МР',
    copy: 'Стартовый баланс, который выглядит убедительно ровно до первой попытки его потратить.'
  },
  {
    icon: 'credit_card',
    title: 'Карта «Шесть семь»',
    subtitle: 'Пластик будущего',
    rate: '6.7%',
    copy: 'Кэшбэк на всё, что мы успели придумать. Выпуск карты занимает от шести до семи рабочих минут.'
  },
  {
    icon: 'savings',
    title: 'Вклад «После шести»',
    subtitle: 'Для тех, кто умеет ждать',
    rate: '6.7 лет',
    copy: 'Деньги лежат спокойно. Вы тоже, если не будете проверять начисления до версии 7.0.'
  }
]

const history = [
  { version: 'M 1', title: 'Появился', text: 'Первый Mannru. Никто не понял, зачем.' },
  { version: 'M 2', title: 'Обновился', text: 'Добавили кнопку. Она ничего не делала.' },
  { version: 'M 3', title: 'Уверовал', text: 'Начали говорить о финансовой экосистеме.' },
  { version: 'M 4', title: 'Исчез', text: 'Вместе с балансом и исходниками.' },
  { version: 'M 5', title: 'Вернулся', text: 'Ненадолго. Зато с новой иконкой.' },
  { version: '6.7', title: 'Выпущен', text: 'Пять прошлых версий позади. Дальше только проценты.' }
]

const rates = [
  { name: 'Счёт 6.7', rate: '6.7%', term: 'бессрочно', note: 'если не закрывать' },
  { name: 'Карта «Шесть семь»', rate: '6.7%', term: 'на покупки', note: 'кэшбэк воображаемый' },
  { name: 'Вклад «После шести»', rate: '6.7%', term: '6.7 лет', note: 'можно смотреть, нельзя снять' },
  { name: 'Перевод между версиями', rate: '67 МР', term: 'мгновенно', note: 'только в макете' }
]

const faqs = [
  {
    question: 'Это настоящий банк?',
    answer: 'Нет. Это настоящая landing-страница вымышленного банка. Никаких счетов, переводов и внезапных списаний здесь нет.'
  },
  {
    question: 'Почему 6.7, если это шестая версия?',
    answer: 'Потому что пять Mannru уже были. Шесть звучит слишком уверенно, а 6.7 — достаточно загадочно.'
  },
  {
    question: 'Что случилось с предыдущими Mannru?',
    answer: 'Они стали историей. Пять попыток, пять архивов и ни одного вывода, кроме того, что шестая с половиной звучит лучше.'
  },
  {
    question: 'Можно открыть счёт?',
    answer: 'Можно нажать на кнопку. Это почти то же самое, только без денег, идентификации и юридических последствий.'
  }
]
</script>

<template>
  <div>
    <v-container class="py-16">
      <v-row
        align="center"
        class="py-8"
      >
        <v-col
          cols="12"
          md="7"
        >
          <span class="text-label-large text-uppercase text-secondary d-flex align-center ga-2">
            <v-icon
              icon="verified"
              size="16"
            />
            Маннру 6.7 · финальный релиз
          </span>
          <h1 class="text-6xl md:text-8xl font-weight-bold mt-4 mb-0">
            Банк, который пережил <PixelWave
              text="пять предыдущих."
              class="text-secondary"
            />
          </h1>
          <p class="text-body-large text-medium-emphasis mt-6 mb-0">
            Шестая с половиной попытка сделать вид, что у нас есть банковское приложение. Счёт, карта, проценты и очень честный дисклеймер.
          </p>
          <div class="mt-8 d-flex flex-wrap ga-3">
            <v-btn
              :href="'/login'"
              color="primary"
              size="large"
              append-icon="arrow_forward"
              @click.prevent="navigateTo('/login')"
            >
              Открыть счёт
            </v-btn>
            <v-btn
              href="#history"
              color="primary"
              variant="outlined"
              size="large"
            >
              История Mannru
            </v-btn>
          </div>
          <p class="mt-8 text-body-small text-medium-emphasis d-flex align-center ga-1 mb-0">
            <v-icon
              icon="lock"
              size="16"
            />
            Защищено 67-битным шифрованием. Наверное.
          </p>
        </v-col>

        <v-col
          cols="12"
          md="5"
        >
          <v-card
            color="primary"
            elevation="8"
            class="pa-6 pa-md-8 text-center"
          >
            <The67Gesture />
            <div class="mt-4 text-body-small">
              официальный жест банка · боб-боб
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-container class="pb-8">
      <v-row>
        <v-col
          v-for="metric in metrics"
          :key="metric.label"
          cols="6"
          sm="3"
        >
          <v-card
            color="primary"
            class="pa-6 text-center"
          >
            <div class="text-3xl font-weight-bold">
              {{ metric.value }}
            </div>
            <div class="text-body-small mt-2">
              {{ metric.label }}
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-container class="pb-16">
      <v-row
        justify="center"
      >
        <v-col
          cols="12"
          md="8"
          lg="6"
        >
          <v-card
            color="surface"
            elevation="8"
            class="overflow-hidden"
          >
            <v-toolbar
              color="primary"
              density="compact"
            >
              <v-toolbar-title class="text-title-medium">
                Личный кабинет
              </v-toolbar-title>
              <v-chip
                color="success"
                size="x-small"
              >
                онлайн
              </v-chip>
            </v-toolbar>
            <v-card-text class="pa-6">
              <div class="text-label-large text-uppercase text-medium-emphasis">
                Доступный баланс
              </div>
              <div class="text-5xl font-weight-light">
                67<small class="text-secondary text-lg font-weight-medium">.00 МР</small>
              </div>
              <v-row class="mt-6">
                <v-col
                  v-for="stat in stats"
                  :key="stat.label"
                  cols="6"
                >
                  <v-sheet
                    color="surface-variant"
                    rounded="sm"
                    class="pa-3"
                  >
                    <div class="text-body-small text-medium-emphasis">
                      {{ stat.label }}
                    </div>
                    <div class="text-title-large font-weight-medium">
                      {{ stat.value }}
                    </div>
                  </v-sheet>
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions class="pa-6 pt-0">
              <v-btn
                color="primary"
                block
              >
                Пополнить
              </v-btn>
              <v-btn
                color="primary"
                variant="outlined"
                block
              >
                История
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <section id="products">
      <v-container class="py-16">
        <div class="mb-8">
          <span class="text-label-large text-uppercase text-secondary">01 / продукты</span>
          <h2 class="text-3xl md:text-4xl mt-2 mb-2">
            Банковские продукты версии 6.7
          </h2>
          <p class="text-body-large text-medium-emphasis mb-0">
            Всё необходимое для финансовой жизни. Или для хорошего макета финансовой жизни.
          </p>
        </div>
        <v-row>
          <v-col
            v-for="product in products"
            :key="product.title"
            cols="12"
            md="4"
          >
            <v-card
              elevation="2"
              class="h-100 d-flex flex-column"
            >
              <v-card-item>
                <template #prepend>
                  <v-avatar
                    color="primary"
                    rounded="lg"
                  >
                    <v-icon
                      :icon="product.icon"
                      color="on-primary"
                    />
                  </v-avatar>
                </template>
                <v-card-title class="text-title-large font-weight-bold">
                  {{ product.title }}
                </v-card-title>
                <v-card-subtitle>{{ product.subtitle }}</v-card-subtitle>
              </v-card-item>
              <v-card-text class="flex-grow-1">
                <div class="text-2xl font-weight-bold text-secondary">
                  {{ product.rate }}
                </div>
                <p class="text-body-medium text-medium-emphasis mt-3 mb-0">
                  {{ product.copy }}
                </p>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="primary"
                  variant="text"
                  append-icon="arrow_forward"
                >
                  Подробнее
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section id="history">
      <v-container class="py-16">
        <div class="mb-8">
          <span class="text-label-large text-uppercase text-secondary">02 / история</span>
          <h2 class="text-3xl md:text-4xl mt-2 mb-2">
            Пять предыдущих Mannru не забыты
          </h2>
          <p class="text-body-large text-medium-emphasis mb-0">
            Они просто находятся в архиве. Вместе с частью функциональности и всеми исходными балансами.
          </p>
        </div>
        <v-card elevation="2">
          <v-list class="py-0">
            <v-list-item
              v-for="item in history"
              :key="item.version"
              class="py-2"
            >
              <template #prepend>
                <span class="text-body-small font-weight-bold text-secondary me-4">{{ item.version }}</span>
              </template>
              <v-list-item-title class="font-weight-medium text-body-medium">
                {{ item.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-medium">
                {{ item.text }}
              </v-list-item-subtitle>
              <template #append>
                <v-icon
                  icon="chevron_right"
                  class="text-disabled"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-container>
    </section>

    <section id="rates">
      <v-container class="py-16">
        <div class="mb-8">
          <span class="text-label-large text-uppercase text-secondary">03 / тарифы</span>
          <h2 class="text-3xl md:text-4xl mt-2 mb-2">
            Прозрачно, как стекло. Почти.
          </h2>
          <p class="text-body-large text-medium-emphasis mb-0">
            Все цифры случайны, кроме 6.7. Таблица составлена в интересах красивого интерфейса.
          </p>
        </div>
        <v-card
          elevation="2"
          class="overflow-hidden"
        >
          <v-table density="comfortable">
            <thead>
              <tr>
                <th class="text-label-large text-uppercase">
                  Продукт
                </th>
                <th class="text-label-large text-uppercase">
                  Ставка
                </th>
                <th class="text-label-large text-uppercase">
                  Срок
                </th>
                <th class="text-label-large text-uppercase">
                  Комментарий
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rates"
                :key="row.name"
              >
                <td class="font-weight-medium">
                  {{ row.name }}
                </td>
                <td>
                  <v-chip
                    color="primary"
                    size="small"
                  >
                    {{ row.rate }}
                  </v-chip>
                </td>
                <td>{{ row.term }}</td>
                <td class="text-medium-emphasis">
                  {{ row.note }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-container>
    </section>

    <section id="faq">
      <v-container class="py-16">
        <div class="mb-8">
          <span class="text-label-large text-uppercase text-secondary">04 / помощь</span>
          <h2 class="text-3xl md:text-4xl mt-2 mb-2">
            Частые вопросы
          </h2>
          <p class="text-body-large text-medium-emphasis mb-0">
            Ответы короткие, потому что банк вымышленный и служба поддержки тоже.
          </p>
        </div>
        <v-expansion-panels variant="accordion">
          <v-expansion-panel
            v-for="item in faqs"
            :key="item.question"
          >
            <v-expansion-panel-title class="text-title-large font-weight-bold">
              {{ item.question }}
            </v-expansion-panel-title>
            <v-expansion-panel-text class="text-body-large text-medium-emphasis">
              {{ item.answer }}
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
    </section>

    <section id="open-account">
      <v-container class="pb-16">
        <v-card
          color="primary"
          class="pa-8 pa-md-12 text-center"
        >
          <span class="text-label-large text-uppercase">05 / следующий шаг</span>
          <h2 class="text-3xl md:text-5xl mt-3 mb-4">
            Давайте сделаем вид, что вы клиент.
          </h2>
          <p class="text-body-large mx-auto mb-8 max-w-md">
            Нажмите кнопку. Ничего не произойдёт, зато интерфейс отработает безупречно.
          </p>
          <v-btn
            :href="'/login'"
            color="secondary"
            size="large"
            append-icon="arrow_forward"
            @click.prevent="navigateTo('/login')"
          >
            Начать с 6.7
          </v-btn>
        </v-card>
      </v-container>
    </section>

    <MannruChat />
  </div>
</template>
