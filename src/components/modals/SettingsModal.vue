<template>
  <Dialog :open="modelValue" @update:open="v => $emit('update:modelValue', v)">
    <DialogContent class="!max-w-[820px] p-0 gap-0 overflow-hidden h-[600px] flex flex-col">
      <div class="flex items-center px-5 py-3.5 border-b flex-shrink-0">
        <Settings class="h-4 w-4 text-muted-foreground mr-2" />
        <DialogTitle>{{ $t('modals.settings.title') }}</DialogTitle>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <aside class="w-[180px] bg-muted/30 border-r p-2 flex flex-col gap-0.5 flex-shrink-0">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-left text-sm transition-colors"
            :class="activeTab === tab.id
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="h-3.5 w-3.5 flex-shrink-0" />
            {{ $t(tab.labelKey) }}
          </button>
        </aside>

        <div class="flex-1 overflow-y-auto">
          <!-- ── Appearance ───────────────────────────────────── -->
          <div v-if="activeTab === 'appearance'" class="p-6">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="text-base font-semibold mb-0.5">{{ $t('modals.settings.themeTitle') }}</h3>
                <p class="text-xs text-muted-foreground">{{ $t('modals.settings.themeDesc') }}</p>
              </div>
              <div class="flex gap-2">
                <input
                  ref="themeImportInputRef"
                  type="file"
                  accept="application/json,.json"
                  class="hidden"
                  @change="onImportThemeFile"
                />
                <Button variant="outline" size="sm" @click="themeImportInputRef?.click()">
                  <Upload class="h-3.5 w-3.5" />
                  {{ $t('modals.settings.importJson') }}
                </Button>
                <Button variant="outline" size="sm" @click="exportCurrentTheme">
                  <Download class="h-3.5 w-3.5" />
                  {{ $t('modals.settings.exportCurrent') }}
                </Button>
              </div>
            </div>

            <div v-if="themeStatus.type" class="mb-4">
              <div
                class="flex items-start gap-2 p-3 rounded-lg border text-sm"
                :class="themeStatus.type === 'ok'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'"
              >
                <Check v-if="themeStatus.type === 'ok'" class="h-4 w-4 mt-0.5 flex-shrink-0" :stroke-width="2.5" />
                <AlertCircle v-else class="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold">{{ themeStatus.message }}</div>
                  <ul v-if="themeStatus.errors?.length" class="text-xs mt-1 list-disc pl-4 space-y-0.5">
                    <li v-for="e in themeStatus.errors" :key="e.field">
                      <code class="font-mono">{{ e.field }}</code>: {{ e.message }}
                    </li>
                  </ul>
                </div>
                <button class="text-current opacity-60 hover:opacity-100" @click="themeStatus = { type: null }">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="mb-5">
              <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                {{ $t('modals.settings.builtin') }}
              </div>
              <div class="grid grid-cols-2 gap-3">
                <ThemeCard
                  v-for="t in builtinThemes"
                  :key="t.id"
                  :theme="t"
                  :active="themeStore.theme === t.id"
                  @select="themeStore.setTheme(t.id)"
                  @export="exportTheme(t.id)"
                />
              </div>
            </div>

            <div v-if="themeStore.customThemes.length">
              <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                {{ $t('modals.settings.custom') }}
              </div>
              <div class="grid grid-cols-2 gap-3">
                <ThemeCard
                  v-for="t in themeStore.customThemes"
                  :key="t.id"
                  :theme="t"
                  :active="themeStore.theme === t.id"
                  deletable
                  @select="themeStore.setTheme(t.id)"
                  @delete="removeCustomTheme(t.id, t.name)"
                  @export="exportTheme(t.id)"
                />
              </div>
            </div>

            <details class="mt-6">
              <summary class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground">
                {{ $t('modals.settings.jsonFormat') }}
              </summary>
              <pre class="mt-2 p-3 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto">{{ themeJsonExample }}</pre>
              <p class="text-[11px] text-muted-foreground mt-2">
                {{ $t('modals.settings.jsonColorsHint', { hex: '#1a1a1a', hsl: '"240 10% 4%"' }) }}
              </p>
            </details>
          </div>

          <!-- ── Language ─────────────────────────────────────── -->
          <div v-else-if="activeTab === 'language'" class="p-6">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="text-base font-semibold mb-0.5">{{ $t('modals.settings.languageTitle') }}</h3>
                <p class="text-xs text-muted-foreground">{{ $t('modals.settings.languageDesc') }}</p>
              </div>
              <div class="flex gap-2">
                <input
                  ref="localeImportInputRef"
                  type="file"
                  accept="application/json,.json"
                  class="hidden"
                  @change="onImportLocaleFile"
                />
                <Button variant="outline" size="sm" @click="localeImportInputRef?.click()">
                  <Upload class="h-3.5 w-3.5" />
                  {{ $t('modals.settings.importJson') }}
                </Button>
                <Button variant="outline" size="sm" @click="exportCurrentLocale">
                  <Download class="h-3.5 w-3.5" />
                  {{ $t('modals.settings.exportCurrent') }}
                </Button>
              </div>
            </div>

            <div v-if="localeStatus.type" class="mb-4">
              <div
                class="flex items-start gap-2 p-3 rounded-lg border text-sm"
                :class="localeStatus.type === 'ok'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'"
              >
                <Check v-if="localeStatus.type === 'ok'" class="h-4 w-4 mt-0.5 flex-shrink-0" :stroke-width="2.5" />
                <AlertCircle v-else class="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold">{{ localeStatus.message }}</div>
                  <ul v-if="localeStatus.errors?.length" class="text-xs mt-1 list-disc pl-4 space-y-0.5">
                    <li v-for="e in localeStatus.errors" :key="e.field">
                      <code class="font-mono">{{ e.field }}</code>: {{ e.message }}
                    </li>
                  </ul>
                </div>
                <button class="text-current opacity-60 hover:opacity-100" @click="localeStatus = { type: null }">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="mb-5">
              <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                {{ $t('modals.settings.builtinLocales') }}
              </div>
              <div class="grid grid-cols-2 gap-3">
                <LocaleCard
                  v-for="l in builtinLocales"
                  :key="l.locale"
                  :locale="l"
                  :active="localeStore.locale === l.locale"
                  @select="localeStore.setLocale(l.locale)"
                  @export="exportLocale(l.locale)"
                />
              </div>
            </div>

            <div v-if="localeStore.customLocales.length">
              <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                {{ $t('modals.settings.customLocales') }}
              </div>
              <div class="grid grid-cols-2 gap-3">
                <LocaleCard
                  v-for="l in localeStore.customLocales"
                  :key="l.locale"
                  :locale="l"
                  :active="localeStore.locale === l.locale"
                  deletable
                  @select="localeStore.setLocale(l.locale)"
                  @delete="removeCustomLocale(l.locale, l.nativeName)"
                  @export="exportLocale(l.locale)"
                />
              </div>
            </div>

            <details class="mt-6">
              <summary class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground">
                {{ $t('modals.settings.localeFormat') }}
              </summary>
              <pre class="mt-2 p-3 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto">{{ localeJsonExample }}</pre>
            </details>
          </div>

          <!-- ── GitHub ───────────────────────────────────────── -->
          <div v-else-if="activeTab === 'github'" class="p-6">
            <div class="mb-5">
              <h3 class="text-base font-semibold mb-1">{{ $t('modals.settings.githubAccount') }}</h3>
              <p class="text-xs text-muted-foreground">{{ $t('modals.settings.githubAccountDesc') }}</p>
            </div>

            <div v-if="ghStore.hasToken && !editingToken" class="flex flex-col gap-4">
              <div class="flex items-center gap-3 p-4 rounded-lg border bg-success/5 border-success/30">
                <div class="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0">
                  <Check class="h-4 w-4" :stroke-width="2.5" />
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-sm">{{ $t('modals.settings.tokenConfigured') }}</div>
                  <div class="text-xs text-muted-foreground">{{ $t('modals.settings.tokenAuthenticated') }}</div>
                </div>
                <Button variant="outline" size="sm" @click="editingToken = true">{{ $t('modals.settings.changeToken') }}</Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="text-destructive border-destructive/40 hover:bg-destructive/10 self-start"
                @click="removeToken"
              >
                <Trash2 class="h-3.5 w-3.5" />
                {{ $t('modals.settings.removeToken') }}
              </Button>
            </div>

            <div v-else class="flex flex-col gap-3">
              <p class="text-[13px] text-muted-foreground m-0">
                <i18n-t keypath="modals.settings.tokenIntro">
                  <template #scope><code class="bg-muted px-1 py-px rounded font-mono text-xs">repo</code></template>
                </i18n-t>
              </p>

              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {{ $t('modals.settings.token') }}
                </label>
                <div class="flex gap-2">
                  <Input
                    v-model="tokenDraft"
                    :type="showToken ? 'text' : 'password'"
                    class="flex-1 font-mono"
                    placeholder="ghp_xxxxxxxxxxxx"
                    @keydown.enter="saveToken"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    :title="showToken ? $t('modals.settings.tokenHide') : $t('modals.settings.tokenShow')"
                    @click="showToken = !showToken"
                  >
                    <EyeOff v-if="showToken" class="h-3.5 w-3.5" />
                    <Eye v-else class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <a href="#" class="inline-flex items-center gap-1 text-primary text-xs hover:underline" @click.prevent="openGhTokenPage">
                {{ $t('modals.settings.createTokenLink') }}
                <ExternalLink class="h-2.5 w-2.5" />
              </a>

              <div class="flex gap-2 mt-2">
                <Button size="sm" :disabled="!tokenDraft.trim()" @click="saveToken">{{ $t('modals.settings.saveToken') }}</Button>
                <Button v-if="ghStore.hasToken" variant="outline" size="sm" @click="editingToken = false">{{ $t('common.cancel') }}</Button>
              </div>
            </div>
          </div>

          <!-- ── Notes ──────────────────────────────────────── -->
          <div v-else-if="activeTab === 'notes'" class="p-6">
            <div class="mb-5">
              <h3 class="text-base font-semibold mb-1">{{ $t('modals.settings.notesPwdTitle') }}</h3>
              <p class="text-xs text-muted-foreground">{{ $t('modals.settings.notesPwdDesc') }}</p>
            </div>

            <div v-if="notesStore.hasPassword && !notesPasswordDone" class="flex flex-col gap-4">
              <div class="flex items-center gap-3 p-4 rounded-lg border bg-success/5 border-success/30">
                <div class="w-9 h-9 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0">
                  <ShieldCheck class="h-4 w-4" :stroke-width="2.5" />
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-sm">{{ $t('modals.settings.notesPwdSet') }}</div>
                  <div class="text-xs text-muted-foreground">{{ $t('modals.settings.notesPwdSetDesc') }}</div>
                </div>
                <Button variant="outline" size="sm" @click="notesPasswordDone = false; newNotesPassword = ''; confirmNotesPassword = ''">
                  {{ $t('modals.settings.changeToken') }}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="text-destructive border-destructive/40 hover:bg-destructive/10 self-start"
                @click="removeNotesPassword"
              >
                <ShieldOff class="h-3.5 w-3.5" />
                {{ $t('modals.settings.notesRemovePwd') }}
              </Button>
            </div>

            <div v-else class="flex flex-col gap-3 max-w-sm">
              <div v-if="notesPasswordDone" class="flex items-center gap-2 p-3 rounded-lg border bg-success/10 border-success/30 text-success text-sm mb-2">
                <Check class="h-4 w-4" :stroke-width="2.5" />
                {{ $t('modals.settings.notesPwdSaved') }}
              </div>

              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {{ $t('modals.settings.notesPwdNew') }}
                </label>
                <div class="flex gap-2">
                  <Input
                    v-model="newNotesPassword"
                    :type="showNewPwd ? 'text' : 'password'"
                    placeholder="••••••••"
                    @input="notesPasswordError = ''"
                  />
                  <Button variant="outline" size="icon" @click="showNewPwd = !showNewPwd">
                    <EyeOff v-if="showNewPwd" class="h-3.5 w-3.5" />
                    <Eye v-else class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {{ $t('modals.settings.notesPwdConfirm') }}
                </label>
                <div class="flex gap-2">
                  <Input
                    v-model="confirmNotesPassword"
                    :type="showConfirmPwd ? 'text' : 'password'"
                    placeholder="••••••••"
                    @input="notesPasswordError = ''"
                    @keydown.enter="saveNotesPassword"
                  />
                  <Button variant="outline" size="icon" @click="showConfirmPwd = !showConfirmPwd">
                    <EyeOff v-if="showConfirmPwd" class="h-3.5 w-3.5" />
                    <Eye v-else class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <p v-if="notesPasswordError" class="text-destructive text-xs">{{ notesPasswordError }}</p>

              <Button size="sm" class="self-start" :disabled="!newNotesPassword || !confirmNotesPassword" @click="saveNotesPassword">
                <Lock class="h-3.5 w-3.5" />
                {{ $t('modals.settings.notesPwdSave') }}
              </Button>
            </div>
          </div>

          <!-- ── Backup ────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'backup'" class="p-6 flex flex-col gap-6">
            <div>
              <h3 class="text-base font-semibold mb-1">{{ $t('modals.settings.backupTitle') }}</h3>
              <p class="text-xs text-muted-foreground">{{ $t('modals.settings.backupDesc') }}</p>
            </div>

            <div v-if="backupStatus.type" class="flex items-start gap-2 p-3 rounded-lg border text-sm"
              :class="backupStatus.type === 'ok' ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'">
              <Check v-if="backupStatus.type === 'ok'" class="h-4 w-4 mt-0.5 flex-shrink-0" :stroke-width="2.5" />
              <AlertCircle v-else class="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span class="flex-1 text-xs">{{ backupStatus.message }}</span>
              <button class="text-current opacity-60 hover:opacity-100" @click="backupStatus = { type: null }">
                <X class="h-3.5 w-3.5" />
              </button>
            </div>

            <div class="flex flex-col gap-3">
              <!-- Export -->
              <div class="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                    <HardDriveDownload class="h-4 w-4" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold">{{ $t('modals.settings.backupExport') }}</div>
                    <div class="text-xs text-muted-foreground">{{ $t('modals.settings.backupExportDesc') }}</div>
                  </div>
                </div>
                <Button size="sm" :disabled="backupBusy" @click="doExport">
                  <Download class="h-3.5 w-3.5" />
                  {{ $t('common.export') }}
                </Button>
              </div>

              <!-- Import -->
              <div class="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-md bg-warning/15 text-warning flex items-center justify-center flex-shrink-0">
                    <HardDriveUpload class="h-4 w-4" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold">{{ $t('modals.settings.backupImport') }}</div>
                    <div class="text-xs text-muted-foreground">{{ $t('modals.settings.backupImportDesc') }}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" :disabled="backupBusy" @click="doImport">
                  <Upload class="h-3.5 w-3.5" />
                  {{ $t('common.import') }}
                </Button>
              </div>

              <!-- Open folder -->
              <div class="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                    <FolderOpen class="h-4 w-4" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold">{{ $t('modals.settings.backupOpenFolder') }}</div>
                    <div class="text-xs text-muted-foreground">{{ $t('modals.settings.backupOpenFolderDesc') }}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" @click="openDataFolder">
                  <FolderOpen class="h-3.5 w-3.5" />
                  {{ $t('common.open') }}
                </Button>
              </div>
            </div>
          </div>

          <!-- ── About ────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'about'" class="p-6">
            <!-- BIT — publisher (primary, at top) -->
            <div class="flex items-center gap-3 mb-5">
              <div class="w-14 h-14 rounded-xl bg-foreground text-background flex items-center justify-center font-bold text-lg tracking-tight flex-shrink-0">
                BIT
              </div>
              <div>
                <h3 class="text-lg font-bold">BIT — Bantu Internet Technologies</h3>
                <p class="text-xs text-muted-foreground">Lda.</p>
              </div>
            </div>

            <!-- Orbit — product (secondary, below BIT) -->
            <div class="mb-5 flex items-center gap-2.5 p-3 rounded-lg border bg-muted/30">
              <div class="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                <LayoutGrid class="h-4 w-4" />
              </div>
              <div class="flex-1">
                <div class="text-[13px] font-semibold">Orbit <span class="font-normal text-muted-foreground text-[12px]">v{{ version }}</span></div>
                <div class="text-[11px] text-muted-foreground">{{ $t('modals.settings.aboutTagline') }}</div>
              </div>
            </div>

            <div class="flex flex-col gap-1 text-sm">
              <div class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 transition-colors">
                <span class="text-muted-foreground">{{ $t('modals.settings.aboutElectron') }}</span>
                <span class="font-mono text-xs">{{ env.electron }}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 transition-colors">
                <span class="text-muted-foreground">{{ $t('modals.settings.aboutChromium') }}</span>
                <span class="font-mono text-xs">{{ env.chrome }}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 transition-colors">
                <span class="text-muted-foreground">{{ $t('modals.settings.aboutNode') }}</span>
                <span class="font-mono text-xs">{{ env.node }}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 transition-colors">
                <span class="text-muted-foreground">{{ $t('modals.settings.aboutPlatform') }}</span>
                <span class="font-mono text-xs">{{ env.platform }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import { useGithubStore } from '@/stores/github'
import ThemeCard from '@/components/ThemeCard.vue'
import LocaleCard from '@/components/LocaleCard.vue'
import {
  Settings, Palette, Globe, Github, Info, Check, Eye, EyeOff, ExternalLink,
  Trash2, LayoutGrid, Upload, Download, AlertCircle, X, NotebookPen, Lock, ShieldCheck, ShieldOff,
  HardDriveDownload, FolderOpen, HardDriveUpload,
} from 'lucide-vue-next'
import { useNotesStore } from '@/stores/notes'

type TabId = 'appearance' | 'language' | 'github' | 'notes' | 'backup' | 'about'

const props = withDefaults(defineProps<{
  modelValue: boolean
  initialTab?: TabId
}>(), { initialTab: 'appearance' })

defineEmits<{ 'update:modelValue': [boolean] }>()

const { t } = useI18n()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()
const ghStore = useGithubStore()

const notesStore = useNotesStore()

const tabs = [
  { id: 'appearance' as const, labelKey: 'modals.settings.appearance', icon: Palette },
  { id: 'language' as const,   labelKey: 'modals.settings.language',   icon: Globe },
  { id: 'github' as const,     labelKey: 'modals.settings.github',     icon: Github },
  { id: 'notes' as const,      labelKey: 'modals.settings.notesTab',   icon: NotebookPen },
  { id: 'backup' as const,     labelKey: 'modals.settings.backupTab',  icon: HardDriveDownload },
  { id: 'about' as const,      labelKey: 'modals.settings.about',      icon: Info },
]

// ── Notes password ───────────────────────────────────────────
const newNotesPassword  = ref('')
const confirmNotesPassword = ref('')
const notesPasswordError = ref('')
const notesPasswordDone  = ref(false)
const showNewPwd = ref(false)
const showConfirmPwd = ref(false)

async function saveNotesPassword() {
  notesPasswordError.value = ''
  if (newNotesPassword.value.length < 4) {
    notesPasswordError.value = t('modals.settings.notesPwdTooShort')
    return
  }
  if (newNotesPassword.value !== confirmNotesPassword.value) {
    notesPasswordError.value = t('modals.settings.notesPwdMismatch')
    return
  }
  await notesStore.setPassword(newNotesPassword.value)
  newNotesPassword.value = ''
  confirmNotesPassword.value = ''
  notesPasswordDone.value = true
}

async function removeNotesPassword() {
  if (!confirm(t('modals.settings.notesRemovePwdConfirm'))) return
  await notesStore.removePassword()
  notesPasswordDone.value = false
}

const activeTab = ref<TabId>(props.initialTab)

watch(() => props.modelValue, (v) => {
  if (v) {
    activeTab.value = props.initialTab
    editingToken.value = false
    tokenDraft.value = ''
    themeStatus.value = { type: null }
    localeStatus.value = { type: null }
  }
})
watch(() => props.initialTab, (v) => { activeTab.value = v })

const builtinThemes = computed(() => themeStore.themes.filter((x) => x.builtin))
const builtinLocales = computed(() => localeStore.locales.filter((x) => x.builtin))

// ── Theme import/export ──────────────────────────────────────
const themeImportInputRef = ref<HTMLInputElement | null>(null)
type ImportStatus = {
  type: 'ok' | 'error' | null
  message?: string
  errors?: { field: string; message: string }[]
}
const themeStatus = ref<ImportStatus>({ type: null })

async function onImportThemeFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const result = themeStore.importJson(text)
    if (result.ok && result.theme) {
      themeStatus.value = { type: 'ok', message: t('modals.settings.importOk', { name: result.theme.name }) }
      themeStore.setTheme(result.theme.id)
    } else {
      themeStatus.value = { type: 'error', message: t('modals.settings.importFail'), errors: result.errors }
    }
  } catch (err: any) {
    themeStatus.value = { type: 'error', message: err?.message ?? t('modals.settings.readError') }
  } finally {
    if (themeImportInputRef.value) themeImportInputRef.value.value = ''
  }
}

function exportCurrentTheme() { exportTheme(themeStore.theme) }

function exportTheme(id: string) {
  const json = themeStore.exportJson(id)
  if (!json) return
  const theme = themeStore.themes.find((x) => x.id === id)
  downloadFile(`${id}.orbit-theme.json`, json)
  themeStatus.value = { type: 'ok', message: t('modals.settings.exportOk', { name: theme?.name ?? id }) }
}

function removeCustomTheme(id: string, name: string) {
  if (!confirm(t('modals.settings.removeThemeConfirm', { name }))) return
  themeStore.removeCustom(id)
}

// ── Locale import/export ─────────────────────────────────────
const localeImportInputRef = ref<HTMLInputElement | null>(null)
const localeStatus = ref<ImportStatus>({ type: null })

async function onImportLocaleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const result = localeStore.importJson(text)
    if (result.ok && result.locale) {
      localeStatus.value = { type: 'ok', message: t('modals.settings.importLocaleOk', { name: result.locale.nativeName }) }
      localeStore.setLocale(result.locale.locale)
    } else {
      localeStatus.value = { type: 'error', message: t('modals.settings.importLocaleFail'), errors: result.errors }
    }
  } catch (err: any) {
    localeStatus.value = { type: 'error', message: err?.message ?? t('modals.settings.readError') }
  } finally {
    if (localeImportInputRef.value) localeImportInputRef.value.value = ''
  }
}

function exportCurrentLocale() { exportLocale(localeStore.locale) }

function exportLocale(id: string) {
  const json = localeStore.exportJson(id)
  if (!json) return
  const locale = localeStore.locales.find((x) => x.locale === id)
  downloadFile(`${id}.orbit-locale.json`, json)
  localeStatus.value = { type: 'ok', message: t('modals.settings.exportLocaleOk', { name: locale?.nativeName ?? id }) }
}

function removeCustomLocale(id: string, name: string) {
  if (!confirm(t('modals.settings.removeLocaleConfirm', { name }))) return
  localeStore.removeCustom(id)
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

// ── GitHub ───────────────────────────────────────────────────
const tokenDraft = ref('')
const showToken = ref(false)
const editingToken = ref(false)

async function saveToken() {
  if (!tokenDraft.value.trim()) return
  await ghStore.saveToken(tokenDraft.value.trim())
  tokenDraft.value = ''
  editingToken.value = false
}

async function removeToken() {
  if (!confirm(t('modals.settings.confirmRemoveToken'))) return
  await ghStore.saveToken('')
  editingToken.value = true
}

function openGhTokenPage() {
  window.electron.shell.openExternal('https://github.com/settings/tokens/new')
}

// ── Backup ───────────────────────────────────────────────────
type BackupStatus = { type: 'ok' | 'error' | null; message?: string }
const backupStatus = ref<BackupStatus>({ type: null })
const backupBusy   = ref(false)

async function doExport() {
  backupBusy.value = true
  backupStatus.value = { type: null }
  try {
    const res = await window.electron.backup.export()
    if (res.ok) backupStatus.value = { type: 'ok', message: t('modals.settings.backupExportOk', { path: res.path ?? '' }) }
  } catch {
    backupStatus.value = { type: 'error', message: t('modals.settings.backupError') }
  } finally { backupBusy.value = false }
}

async function doImport() {
  backupBusy.value = true
  backupStatus.value = { type: null }
  try {
    const res = await window.electron.backup.import()
    if (res.ok) backupStatus.value = { type: 'ok', message: t('modals.settings.backupImportOk', { n: res.projectCount ?? 0 }) }
    else if (res.error) backupStatus.value = { type: 'error', message: res.error }
  } catch {
    backupStatus.value = { type: 'error', message: t('modals.settings.backupError') }
  } finally { backupBusy.value = false }
}

function openDataFolder() { window.electron.backup.openFolder() }

// ── About ────────────────────────────────────────────────────
const version = '0.1.0'
const appVersions = window.electron.app.versions
const env = {
  electron: appVersions.electron ?? '—',
  chrome:   appVersions.chrome   ?? '—',
  node:     appVersions.node     ?? '—',
  platform: `${window.electron.app.platform} (${navigator.userAgent.match(/\(([^)]+)\)/)?.[1] ?? navigator.platform})`,
}

// ── JSON examples ────────────────────────────────────────────
const themeJsonExample = `{
  "id": "my-theme",
  "name": "Meu Tema",
  "mode": "dark",
  "colors": {
    "background": "#1a1a1a",
    "foreground": "#ffffff",
    "primary": "#00bd7d"
  }
}`

const localeJsonExample = `{
  "locale": "fr",
  "name": "French",
  "nativeName": "Français",
  "flag": "🇫🇷",
  "messages": {
    "common": { "save": "Enregistrer", "cancel": "Annuler" },
    "dashboard": { "pull": "Récupérer", "push": "Envoyer" }
  }
}`
</script>
