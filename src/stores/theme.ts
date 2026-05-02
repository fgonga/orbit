import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  BUILTIN_THEMES,
  COLOR_VARS,
  type Theme,
  type ThemeColors,
  importThemeJson,
  exportThemeJson,
} from '@/lib/themes'

const LS_SELECTED = 'orbit-theme'
const LS_CUSTOM   = 'orbit-custom-themes'

// One-shot migration from the pre-rename (GitDash) keys. Runs on module import.
function migrateKey(oldKey: string, newKey: string) {
  if (localStorage.getItem(newKey) != null) return
  const value = localStorage.getItem(oldKey)
  if (value != null) {
    localStorage.setItem(newKey, value)
    localStorage.removeItem(oldKey)
  }
}
migrateKey('gitdash-theme', LS_SELECTED)
migrateKey('gitdash-custom-themes', LS_CUSTOM)

export const useThemeStore = defineStore('theme', () => {
  const customThemes = ref<Theme[]>(loadCustom())
  const selectedId = ref<string>(localStorage.getItem(LS_SELECTED) ?? 'dark')

  const themes = computed<Theme[]>(() => [...BUILTIN_THEMES, ...customThemes.value])

  const current = computed<Theme>(() =>
    themes.value.find((t) => t.id === selectedId.value) ?? BUILTIN_THEMES[0],
  )

  // Preserves the existing API (Dashboard, ThemePicker use `theme` as the id).
  const theme = computed<string>(() => selectedId.value)

  function apply(t: Theme) {
    const root = document.documentElement
    root.classList.toggle('dark', t.mode === 'dark')
    root.style.colorScheme = t.mode
    for (const key of Object.keys(COLOR_VARS) as (keyof ThemeColors)[]) {
      root.style.setProperty(COLOR_VARS[key], t.colors[key])
    }
    root.dataset.theme = t.id
  }

  function setTheme(id: string) {
    if (themes.value.some((t) => t.id === id)) selectedId.value = id
  }

  function toggle() {
    const list = themes.value
    const idx = list.findIndex((t) => t.id === selectedId.value)
    selectedId.value = list[(idx + 1) % list.length].id
  }

  // ── Custom themes: CRUD ────────────────────────────────────
  function addCustom(t: Theme): Theme {
    let id = t.id
    let n = 2
    while (themes.value.some((x) => x.id === id)) id = `${t.id}-${n++}`
    const theme: Theme = { ...t, id, builtin: false }
    customThemes.value.push(theme)
    saveCustom()
    return theme
  }

  function removeCustom(id: string) {
    if (!customThemes.value.some((x) => x.id === id)) return
    customThemes.value = customThemes.value.filter((x) => x.id !== id)
    saveCustom()
    if (selectedId.value === id) selectedId.value = 'dark'
  }

  function importJson(json: string) {
    const result = importThemeJson(json)
    if (!result.ok || !result.theme) return result
    const added = addCustom(result.theme)
    return { ok: true, errors: [], theme: added }
  }

  function exportJson(id: string): string | null {
    const t = themes.value.find((x) => x.id === id)
    return t ? exportThemeJson(t) : null
  }

  function saveCustom() {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(customThemes.value))
  }

  function loadCustom(): Theme[] {
    try {
      const raw = localStorage.getItem(LS_CUSTOM)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((t) =>
        t && typeof t === 'object' && typeof t.id === 'string' && typeof t.colors === 'object'
      )
    } catch { return [] }
  }

  watch(selectedId, (id) => {
    localStorage.setItem(LS_SELECTED, id)
    apply(current.value)
  }, { immediate: true })

  // Re-apply if a custom theme (currently active) gets edited
  watch(customThemes, () => {
    if (!BUILTIN_THEMES.some((t) => t.id === selectedId.value)) {
      apply(current.value)
    }
  }, { deep: true })

  return {
    theme,         // string id — back-compat
    themes,        // computed Theme[]
    current,       // computed Theme
    customThemes,
    setTheme,
    toggle,
    addCustom,
    removeCustom,
    importJson,
    exportJson,
  }
})
