import { ref, watch } from 'vue'

export function useResizable(key: string, defaultWidth: number, min: number, max: number) {
  const stored = localStorage.getItem(`gd:layout:${key}`)
  const width = ref(stored ? Math.max(min, Math.min(max, Number(stored))) : defaultWidth)

  watch(width, (v) => localStorage.setItem(`gd:layout:${key}`, String(v)))

  function onResize(delta: number) {
    width.value = Math.max(min, Math.min(max, width.value + delta))
  }

  return { width, onResize }
}
