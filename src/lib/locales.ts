/**
 * Locale data model. Each locale is self-contained (code + metadata + messages)
 * so it can be exported / imported as a single JSON file.
 */

export interface LocaleMessages {
  [key: string]: string | LocaleMessages
}

export interface Locale {
  /** BCP-47 tag used by Intl APIs (e.g. "pt-PT", "en") */
  locale: string
  /** English name, e.g. "Portuguese (Portugal)" */
  name: string
  /** Native name, e.g. "Português" */
  nativeName: string
  /** Emoji flag */
  flag: string
  /** Message tree */
  messages: LocaleMessages
  /** Built-in locales can't be deleted */
  builtin?: boolean
}

// ─────────────────────────────────────────────────────────────
// Import / export helpers
// ─────────────────────────────────────────────────────────────

export interface LocaleImportIssue { field: string; message: string }
export interface LocaleImportResult {
  ok: boolean
  locale?: Locale
  errors: LocaleImportIssue[]
}

export function importLocaleJson(json: string): LocaleImportResult {
  const errors: LocaleImportIssue[] = []
  let obj: any
  try { obj = JSON.parse(json) }
  catch { return { ok: false, errors: [{ field: 'json', message: 'JSON inválido' }] } }

  if (typeof obj !== 'object' || !obj) {
    return { ok: false, errors: [{ field: 'root', message: 'Esperado um objecto' }] }
  }

  const locale = String(obj.locale ?? '').trim()
  if (!locale) errors.push({ field: 'locale', message: 'locale (código BCP-47) é obrigatório, ex: "pt-PT"' })

  const name = String(obj.name ?? '').trim() || locale
  const nativeName = String(obj.nativeName ?? '').trim() || name
  const flag = String(obj.flag ?? '').trim() || '🌐'

  if (typeof obj.messages !== 'object' || !obj.messages) {
    errors.push({ field: 'messages', message: 'messages é obrigatório (objecto aninhado)' })
  }

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    locale: { locale, name, nativeName, flag, messages: obj.messages, builtin: false },
  }
}

export function exportLocaleJson(locale: Locale): string {
  return JSON.stringify({
    locale: locale.locale,
    name: locale.name,
    nativeName: locale.nativeName,
    flag: locale.flag,
    messages: locale.messages,
  }, null, 2)
}

/** Deep-merge a user-supplied message tree on top of a base (fallback values). */
export function mergeMessages(base: LocaleMessages, override: LocaleMessages): LocaleMessages {
  const out: LocaleMessages = { ...base }
  for (const [key, val] of Object.entries(override)) {
    const baseVal = (base as any)[key]
    if (val && typeof val === 'object' && baseVal && typeof baseVal === 'object') {
      out[key] = mergeMessages(baseVal, val as LocaleMessages)
    } else {
      out[key] = val
    }
  }
  return out
}
