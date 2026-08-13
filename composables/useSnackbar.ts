type SnackbarType = 'success' | 'error' | 'info'

export function useSnackbar() {
  const state = useState('mannru-snackbar', () => ({
    visible: false,
    text: '',
    type: 'info' as SnackbarType
  }))

  function show(text: string, type: SnackbarType = 'info') {
    state.value.text = text
    state.value.type = type
    state.value.visible = true
  }

  function close() {
    state.value.visible = false
  }

  return { state, show, close }
}
