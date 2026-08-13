/* Мобильная проверка: true при ширине экрана меньше 900px.
 * SSR-безопасно: на сервере всегда false (клиент подхватывает после гидрации). */
export function useIsMobile() {
  const isMobile = ref(false)

  onMounted(() => {
    const query = window.matchMedia('(max-width: 899px)')
    const update = () => {
      isMobile.value = query.matches
    }
    update()
    query.addEventListener('change', update)
    onUnmounted(() => query.removeEventListener('change', update))
  })

  return isMobile
}
