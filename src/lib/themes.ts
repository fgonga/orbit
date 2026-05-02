/**
 * Theme data model.
 *
 * Colors are stored as HSL triplets in the format "H S% L%" (matching Tailwind's
 * CSS variable convention: `hsl(var(--primary))`). Importers also accept HEX —
 * see `hexToHsl` below.
 */

export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
  info: string
  infoForeground: string
  border: string
  input: string
  ring: string
}

export interface Theme {
  id: string
  name: string
  mode: ThemeMode
  /** Preview swatches shown in the picker: [background, primary, accent] as HEX */
  swatch: [string, string, string]
  colors: ThemeColors
  /** Built-in themes can't be deleted */
  builtin?: boolean
}

/** Maps camelCase color keys → kebab-case CSS vars. */
export const COLOR_VARS: Record<keyof ThemeColors, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  warning: '--warning',
  warningForeground: '--warning-foreground',
  info: '--info',
  infoForeground: '--info-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
}

// ─────────────────────────────────────────────────────────────
// Built-in themes
// ─────────────────────────────────────────────────────────────

export const BUILTIN_THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    mode: 'dark',
    builtin: true,
    swatch: ['#0a0a0c', '#00bd7d', '#212127'],
    colors: {
      background: '240 10% 4%',
      foreground: '0 0% 98%',
      card: '240 8% 7%',
      cardForeground: '0 0% 98%',
      popover: '240 8% 7%',
      popoverForeground: '0 0% 98%',
      primary: '160 100% 37%',
      primaryForeground: '0 0% 100%',
      secondary: '240 4% 14%',
      secondaryForeground: '0 0% 98%',
      muted: '240 4% 14%',
      mutedForeground: '240 5% 65%',
      accent: '240 4% 16%',
      accentForeground: '0 0% 98%',
      destructive: '0 72% 51%',
      destructiveForeground: '0 0% 98%',
      success: '142 65% 47%',
      successForeground: '0 0% 100%',
      warning: '38 92% 55%',
      warningForeground: '240 10% 4%',
      info: '217 91% 60%',
      infoForeground: '0 0% 100%',
      border: '240 4% 18%',
      input: '240 4% 18%',
      ring: '160 100% 37%',
    },
  },
  {
    id: 'light',
    name: 'Light',
    mode: 'light',
    builtin: true,
    swatch: ['#ffffff', '#00bd7d', '#f2f2f4'],
    colors: {
      background: '0 0% 100%',
      foreground: '240 10% 3.9%',
      card: '0 0% 100%',
      cardForeground: '240 10% 3.9%',
      popover: '0 0% 100%',
      popoverForeground: '240 10% 3.9%',
      primary: '160 100% 37%',
      primaryForeground: '0 0% 100%',
      secondary: '240 4.8% 95.9%',
      secondaryForeground: '240 5.9% 10%',
      muted: '240 4.8% 95.9%',
      mutedForeground: '240 3.8% 46.1%',
      accent: '240 4.8% 95.9%',
      accentForeground: '240 5.9% 10%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '142 71% 45%',
      successForeground: '0 0% 100%',
      warning: '38 92% 50%',
      warningForeground: '0 0% 100%',
      info: '217 91% 60%',
      infoForeground: '0 0% 100%',
      border: '240 5.9% 90%',
      input: '240 5.9% 90%',
      ring: '160 100% 37%',
    },
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    mode: 'dark',
    builtin: true,
    swatch: ['#0d1117', '#2f81f7', '#30363d'],
    colors: {
      background: '215 28% 7%',
      foreground: '213 15% 88%',
      card: '213 26% 11%',
      cardForeground: '213 15% 88%',
      popover: '213 26% 11%',
      popoverForeground: '213 15% 88%',
      primary: '212 92% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '215 14% 17%',
      secondaryForeground: '213 15% 88%',
      muted: '215 14% 17%',
      mutedForeground: '212 9% 58%',
      accent: '215 14% 21%',
      accentForeground: '213 15% 88%',
      destructive: '2 91% 64%',
      destructiveForeground: '0 0% 100%',
      success: '134 61% 41%',
      successForeground: '0 0% 100%',
      warning: '38 82% 48%',
      warningForeground: '0 0% 100%',
      info: '212 92% 45%',
      infoForeground: '0 0% 100%',
      border: '215 14% 20%',
      input: '215 14% 20%',
      ring: '212 92% 45%',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    mode: 'dark',
    builtin: true,
    swatch: ['#282a36', '#bd93f9', '#44475a'],
    colors: {
      background: '231 15% 18%',
      foreground: '60 30% 96%',
      card: '232 14% 23%',
      cardForeground: '60 30% 96%',
      popover: '232 14% 23%',
      popoverForeground: '60 30% 96%',
      primary: '265 89% 78%',
      primaryForeground: '232 14% 11%',
      secondary: '231 15% 26%',
      secondaryForeground: '60 30% 96%',
      muted: '231 15% 26%',
      mutedForeground: '225 27% 51%',
      accent: '231 15% 30%',
      accentForeground: '60 30% 96%',
      destructive: '0 100% 67%',
      destructiveForeground: '60 30% 96%',
      success: '135 94% 65%',
      successForeground: '232 14% 11%',
      warning: '31 100% 71%',
      warningForeground: '232 14% 11%',
      info: '191 97% 77%',
      infoForeground: '232 14% 11%',
      border: '232 14% 31%',
      input: '232 14% 31%',
      ring: '265 89% 78%',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    mode: 'dark',
    builtin: true,
    swatch: ['#2e3440', '#88c0d0', '#434c5e'],
    colors: {
      background: '220 16% 22%',
      foreground: '219 28% 88%',
      card: '222 16% 28%',
      cardForeground: '219 28% 88%',
      popover: '222 16% 28%',
      popoverForeground: '219 28% 88%',
      primary: '193 43% 67%',
      primaryForeground: '220 16% 15%',
      secondary: '220 16% 30%',
      secondaryForeground: '219 28% 88%',
      muted: '220 16% 30%',
      mutedForeground: '219 16% 68%',
      accent: '220 16% 34%',
      accentForeground: '219 28% 88%',
      destructive: '354 42% 56%',
      destructiveForeground: '219 28% 94%',
      success: '92 28% 65%',
      successForeground: '220 16% 15%',
      warning: '40 71% 73%',
      warningForeground: '220 16% 15%',
      info: '210 34% 63%',
      infoForeground: '220 16% 15%',
      border: '220 14% 36%',
      input: '220 14% 36%',
      ring: '193 43% 67%',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    mode: 'dark',
    builtin: true,
    swatch: ['#1a1b26', '#7aa2f7', '#2f3549'],
    colors: {
      background: '236 20% 13%',
      foreground: '229 76% 86%',
      card: '230 23% 19%',
      cardForeground: '229 76% 86%',
      popover: '230 23% 19%',
      popoverForeground: '229 76% 86%',
      primary: '218 89% 72%',
      primaryForeground: '236 20% 8%',
      secondary: '236 20% 22%',
      secondaryForeground: '229 76% 86%',
      muted: '236 20% 22%',
      mutedForeground: '229 20% 66%',
      accent: '236 20% 26%',
      accentForeground: '229 76% 86%',
      destructive: '349 89% 72%',
      destructiveForeground: '236 20% 8%',
      success: '95 48% 61%',
      successForeground: '236 20% 8%',
      warning: '36 64% 64%',
      warningForeground: '236 20% 8%',
      info: '198 100% 74%',
      infoForeground: '236 20% 8%',
      border: '236 20% 28%',
      input: '236 20% 28%',
      ring: '218 89% 72%',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    mode: 'dark',
    builtin: true,
    swatch: ['#1e1e2e', '#cba6f7', '#45475a'],
    colors: {
      background: '240 21% 15%',
      foreground: '226 64% 88%',
      card: '234 13% 23%',
      cardForeground: '226 64% 88%',
      popover: '234 13% 23%',
      popoverForeground: '226 64% 88%',
      primary: '267 84% 81%',
      primaryForeground: '240 21% 12%',
      secondary: '234 13% 26%',
      secondaryForeground: '226 64% 88%',
      muted: '234 13% 26%',
      mutedForeground: '226 24% 70%',
      accent: '234 13% 30%',
      accentForeground: '226 64% 88%',
      destructive: '343 81% 75%',
      destructiveForeground: '240 21% 12%',
      success: '115 54% 76%',
      successForeground: '240 21% 12%',
      warning: '41 86% 83%',
      warningForeground: '240 21% 12%',
      info: '217 92% 76%',
      infoForeground: '240 21% 12%',
      border: '234 13% 32%',
      input: '234 13% 32%',
      ring: '267 84% 81%',
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    mode: 'dark',
    builtin: true,
    swatch: ['#282828', '#fabd2f', '#504945'],
    colors: {
      background: '0 0% 16%',
      foreground: '43 59% 81%',
      card: '20 7% 22%',
      cardForeground: '43 59% 81%',
      popover: '20 7% 22%',
      popoverForeground: '43 59% 81%',
      primary: '42 96% 58%',
      primaryForeground: '0 0% 10%',
      secondary: '20 5% 26%',
      secondaryForeground: '43 59% 81%',
      muted: '20 5% 26%',
      mutedForeground: '30 15% 65%',
      accent: '20 5% 30%',
      accentForeground: '43 59% 81%',
      destructive: '6 96% 59%',
      destructiveForeground: '43 59% 94%',
      success: '61 66% 44%',
      successForeground: '0 0% 10%',
      warning: '24 99% 54%',
      warningForeground: '0 0% 10%',
      info: '165 14% 58%',
      infoForeground: '0 0% 10%',
      border: '20 5% 34%',
      input: '20 5% 34%',
      ring: '42 96% 58%',
    },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    mode: 'dark',
    builtin: true,
    swatch: ['#002b36', '#859900', '#073642'],
    colors: {
      background: '192 100% 11%',
      foreground: '180 7% 60%',
      card: '192 81% 14%',
      cardForeground: '180 7% 68%',
      popover: '192 81% 14%',
      popoverForeground: '180 7% 68%',
      primary: '68 100% 30%',
      primaryForeground: '44 87% 94%',
      secondary: '192 50% 18%',
      secondaryForeground: '180 7% 68%',
      muted: '192 50% 18%',
      mutedForeground: '186 8% 55%',
      accent: '192 50% 22%',
      accentForeground: '180 7% 68%',
      destructive: '1 71% 52%',
      destructiveForeground: '44 87% 94%',
      success: '68 100% 30%',
      successForeground: '44 87% 94%',
      warning: '45 100% 35%',
      warningForeground: '44 87% 94%',
      info: '205 69% 49%',
      infoForeground: '44 87% 94%',
      border: '192 30% 24%',
      input: '192 30% 24%',
      ring: '68 100% 30%',
    },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    mode: 'dark',
    builtin: true,
    swatch: ['#191724', '#eb6f92', '#26233a'],
    colors: {
      background: '249 22% 12%',
      foreground: '245 50% 91%',
      card: '247 23% 15%',
      cardForeground: '245 50% 91%',
      popover: '247 23% 15%',
      popoverForeground: '245 50% 91%',
      primary: '2 66% 75%',
      primaryForeground: '249 22% 12%',
      secondary: '248 24% 20%',
      secondaryForeground: '245 50% 91%',
      muted: '248 24% 20%',
      mutedForeground: '248 15% 68%',
      accent: '248 24% 24%',
      accentForeground: '245 50% 91%',
      destructive: '343 76% 68%',
      destructiveForeground: '249 22% 12%',
      success: '189 43% 73%',
      successForeground: '249 22% 12%',
      warning: '35 88% 72%',
      warningForeground: '249 22% 12%',
      info: '267 57% 78%',
      infoForeground: '249 22% 12%',
      border: '248 22% 26%',
      input: '248 22% 26%',
      ring: '2 66% 75%',
    },
  },
]

// ─────────────────────────────────────────────────────────────
// Color utilities
// ─────────────────────────────────────────────────────────────

/** Convert HEX (#rrggbb / #rgb) to HSL triplet "H S% L%". Returns null on invalid input. */
export function hexToHsl(hex: string): string | null {
  const h = hex.trim().replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null

  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let s = 0, hue = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: hue = ((b - r) / d + 2); break
      case b: hue = ((r - g) / d + 4); break
    }
    hue /= 6
  }
  return `${Math.round(hue * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Normalise a color value from import: accepts HEX, "hsl(H,S%,L%)" or bare "H S% L%". */
export function normaliseColor(value: string): string | null {
  const v = value.trim()
  if (v.startsWith('#')) return hexToHsl(v)
  // hsl(...) form
  const hslFn = v.match(/^hsl\(\s*(\d+)\s*,?\s*(\d+)%\s*,?\s*(\d+)%\s*\)$/i)
  if (hslFn) return `${hslFn[1]} ${hslFn[2]}% ${hslFn[3]}%`
  // Bare "H S% L%"
  if (/^\d+\s+\d+%\s+\d+%$/.test(v)) return v
  return null
}

// ─────────────────────────────────────────────────────────────
// Import / export
// ─────────────────────────────────────────────────────────────

export interface ThemeImportIssue { field: string; message: string }
export interface ThemeImportResult {
  ok: boolean
  theme?: Theme
  errors: ThemeImportIssue[]
}

export function importThemeJson(json: string): ThemeImportResult {
  const errors: ThemeImportIssue[] = []
  let obj: any
  try { obj = JSON.parse(json) }
  catch { return { ok: false, errors: [{ field: 'json', message: 'JSON inválido' }] } }

  if (typeof obj !== 'object' || !obj) {
    return { ok: false, errors: [{ field: 'root', message: 'Esperado um objecto' }] }
  }

  const id = String(obj.id ?? '').trim() || slugify(String(obj.name ?? ''))
  if (!id) errors.push({ field: 'id', message: 'id ou name é obrigatório' })

  const name = String(obj.name ?? '').trim() || id
  const mode: ThemeMode = obj.mode === 'light' ? 'light' : 'dark'

  if (typeof obj.colors !== 'object' || !obj.colors) {
    errors.push({ field: 'colors', message: 'colors é obrigatório' })
    return { ok: false, errors }
  }

  // Fallback to the current dark as the base (missing fields inherit it)
  const base = BUILTIN_THEMES[0].colors
  const colors: ThemeColors = { ...base }

  for (const key of Object.keys(COLOR_VARS) as (keyof ThemeColors)[]) {
    const raw = obj.colors[key]
    if (raw == null) continue
    const norm = normaliseColor(String(raw))
    if (!norm) {
      errors.push({ field: `colors.${key}`, message: `cor inválida: "${raw}" (aceita HEX ou "H S% L%")` })
      continue
    }
    colors[key] = norm
  }

  // Build swatch from the imported theme for the picker
  const swatchHex = (hsl: string): string => {
    // Just use a simple fallback — if obj.swatch provided, prefer it
    return hslStringToHex(hsl)
  }
  const swatch: [string, string, string] = Array.isArray(obj.swatch) && obj.swatch.length === 3
    ? [String(obj.swatch[0]), String(obj.swatch[1]), String(obj.swatch[2])]
    : [swatchHex(colors.background), swatchHex(colors.primary), swatchHex(colors.accent)]

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    theme: { id, name, mode, swatch, colors },
  }
}

export function exportThemeJson(theme: Theme): string {
  return JSON.stringify({
    id: theme.id,
    name: theme.name,
    mode: theme.mode,
    swatch: theme.swatch,
    colors: theme.colors,
  }, null, 2)
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Very rough HSL triplet → HEX. Only used for swatches in the picker. */
export function hslStringToHex(hsl: string): string {
  const m = hsl.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/)
  if (!m) return '#888888'
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
