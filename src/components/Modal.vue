<template>
  <Dialog :open="modelValue" @update:open="(v) => !persistent && $emit('update:modelValue', v)">
    <DialogContent
      class="max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col"
      :style="widthStyle"
      hide-close
      @escape-key-down="(e) => persistent && e.preventDefault()"
      @pointer-down-outside="(e) => persistent && e.preventDefault()"
      @interact-outside="(e) => persistent && e.preventDefault()"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b">
        <div class="flex items-center gap-2 min-w-0">
          <slot name="icon" />
          <DialogTitle class="text-[15px] font-semibold truncate">{{ title }}</DialogTitle>
        </div>
        <button
          class="text-muted-foreground rounded hover:bg-destructive/15 hover:text-destructive transition-colors p-1 flex items-center"
          title="Fechar (Esc)"
          @click="$emit('update:modelValue', false)"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 overflow-y-auto flex-1">
        <slot />
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="flex items-center justify-end gap-2 px-5 py-3 bg-muted/40 border-t">
        <slot name="footer" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  width?: string
  persistent?: boolean
}>(), { persistent: false })

defineEmits<{ 'update:modelValue': [boolean] }>()

const widthStyle = computed(() => {
  if (!props.width) return { maxWidth: '460px' }
  return { width: props.width, maxWidth: props.width }
})
</script>
