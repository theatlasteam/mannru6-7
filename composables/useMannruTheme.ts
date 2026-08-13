export function useMannruTheme() {
  const theme = useTheme()
  const isDark = useState('mannru-theme', () => false)

  watchEffect(() => {
    theme.change(isDark.value ? 'mannruDark' : 'mannruLight')
  })

  onMounted(() => {
    const saved = localStorage.getItem('mannru-theme')
    if (saved === 'light' || saved === 'dark') {
      isDark.value = saved === 'dark'
    }
  })

  watch(isDark, (value) => {
    if (import.meta.client) {
      localStorage.setItem('mannru-theme', value ? 'dark' : 'light')
      window.dispatchEvent(new CustomEvent('mannru-theme-change'))
    }
  })

  const toggle = () => {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
}
