export function toast(text: string) {
  window.dispatchEvent(new CustomEvent('together:toast', { detail: { text } }))
}
