<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" :title="t('theme.pickerTitle', { name: themeStore.current.name })">
        <Palette class="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="text-[11px] uppercase tracking-wider text-muted-foreground">
        {{ t('modals.settings.themeTitle') }}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="theme in themeStore.themes"
        :key="theme.id"
        :class="themeStore.theme === theme.id ? 'bg-accent' : ''"
        @click="themeStore.setTheme(theme.id)"
      >
        <span class="flex items-center gap-0.5 flex-shrink-0">
          <span class="w-3 h-3 rounded-sm border border-border/60" :style="{ background: theme.swatch[0] }" />
          <span class="w-3 h-3 rounded-sm" :style="{ background: theme.swatch[1] }" />
          <span class="w-3 h-3 rounded-sm" :style="{ background: theme.swatch[2] }" />
        </span>
        <span class="flex-1">{{ theme.name }}</span>
        <Check v-if="themeStore.theme === theme.id" class="h-3.5 w-3.5 text-primary" />
        <span v-else class="text-[10px] text-muted-foreground uppercase tracking-wider">
          {{ theme.mode }}
        </span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Palette, Check } from 'lucide-vue-next'

const { t } = useI18n()
const themeStore = useThemeStore()
</script>
