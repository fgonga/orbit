import { createI18n } from 'vue-i18n'
import { ptPT } from '@/locales/pt'
import { ptBR } from '@/locales/pt-BR'
import { en } from '@/locales/en'

// Read the selected locale, falling back to the pre-rename key for first launch after upgrade.
const savedLocale =
  localStorage.getItem('orbit-locale') ??
  localStorage.getItem('gitdash-locale') ??
  'pt-PT'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'pt-PT',
  messages: {
    'pt-PT': ptPT.messages as any,
    'pt-BR': ptBR.messages as any,
    en: en.messages as any,
  },
  missingWarn: false,
  fallbackWarn: false,
})

// Convenience standalone translator for non-component code (stores, utils)
export const t = i18n.global.t as unknown as (key: string, named?: Record<string, unknown>) => string
