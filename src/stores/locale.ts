import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { i18n } from '@/i18n'
import {
  type Locale,
  type LocaleMessages,
  importLocaleJson,
  exportLocaleJson,
  mergeMessages,
} from '@/lib/locales'
import { ptPT } from '@/locales/pt'
import { ptBR } from '@/locales/pt-BR'
import { en } from '@/locales/en'

const LS_SELECTED = 'orbit-locale'
const LS_CUSTOM   = 'orbit-custom-locales'

// One-shot migration from the pre-rename (GitDash) keys.
function migrateKey(oldKey: string, newKey: string) {
  if (localStorage.getItem(newKey) != null) return
  const value = localStorage.getItem(oldKey)
  if (value != null) {
    localStorage.setItem(newKey, value)
    localStorage.removeItem(oldKey)
  }
}
migrateKey('gitdash-locale', LS_SELECTED)
migrateKey('gitdash-custom-locales', LS_CUSTOM)

export const BUILTIN_LOCALES: Locale[] = [ptPT, ptBR, en]

export const useLocaleStore = defineStore('locale', () => {
  const customLocales = ref<Locale[]>(loadCustom())
  const selectedId = ref<string>(localStorage.getItem(LS_SELECTED) ?? ptPT.locale)

  const locales = computed<Locale[]>(() => [...BUILTIN_LOCALES, ...customLocales.value])

  const current = computed<Locale>(() =>
    locales.value.find((l) => l.locale === selectedId.value) ?? ptPT,
  )

  // Back-compat alias — the selected BCP-47 tag
  const locale = computed<string>(() => selectedId.value)

  function apply(l: Locale) {
    // Custom locales may have partial messages → merge over PT defaults
    const merged = l.builtin ? l.messages : mergeMessages(ptPT.messages, l.messages)

    // Register the locale with vue-i18n (overwrites existing one with same tag)
    i18n.global.setLocaleMessage(l.locale, merged as any)
    i18n.global.locale.value = l.locale as any

    document.documentElement.lang = l.locale
  }

  function setLocale(id: string) {
    if (locales.value.some((l) => l.locale === id)) selectedId.value = id
  }

  // ── Custom locales: CRUD ───────────────────────────────────
  function addCustom(l: Locale): Locale {
    let id = l.locale
    let n = 2
    while (locales.value.some((x) => x.locale === id)) id = `${l.locale}-custom${n++}`
    const localeCopy: Locale = { ...l, locale: id, builtin: false }
    customLocales.value.push(localeCopy)
    saveCustom()
    return localeCopy
  }

  function removeCustom(id: string) {
    if (!customLocales.value.some((x) => x.locale === id)) return
    customLocales.value = customLocales.value.filter((x) => x.locale !== id)
    saveCustom()
    if (selectedId.value === id) selectedId.value = ptPT.locale
  }

  function importJson(json: string) {
    const result = importLocaleJson(json)
    if (!result.ok || !result.locale) return result
    const added = addCustom(result.locale)
    return { ok: true, errors: [], locale: added }
  }

  function exportJson(id: string): string | null {
    const l = locales.value.find((x) => x.locale === id)
    return l ? exportLocaleJson(l) : null
  }

  function saveCustom() {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(customLocales.value))
  }

  function loadCustom(): Locale[] {
    try {
      const raw = localStorage.getItem(LS_CUSTOM)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((l) =>
        l && typeof l === 'object' && typeof l.locale === 'string' && typeof l.messages === 'object'
      )
    } catch { return [] }
  }

  // Register all known locales in vue-i18n upfront so `$t` can fallback to any of them
  watch(customLocales, () => {
    for (const l of customLocales.value) {
      const merged = mergeMessages(ptPT.messages, l.messages)
      i18n.global.setLocaleMessage(l.locale, merged as any)
    }
  }, { deep: true, immediate: true })

  watch(selectedId, (id) => {
    localStorage.setItem(LS_SELECTED, id)
    apply(current.value)
  }, { immediate: true })

  return {
    locale,         // computed string
    locales,        // computed Locale[]
    current,        // computed Locale
    customLocales,  // ref Locale[]
    setLocale,
    addCustom,
    removeCustom,
    importJson,
    exportJson,
  }
})

// Helper for non-component code (e.g. stores formatting dates)
export function currentBcp47(): string {
  return localStorage.getItem(LS_SELECTED) ?? ptPT.locale
}

export type { LocaleMessages }
