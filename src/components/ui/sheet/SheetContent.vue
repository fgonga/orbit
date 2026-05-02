<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'radix-vue'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { sheetVariants, type SheetVariants } from '.'

interface Props extends DialogContentProps {
  class?: string
  side?: SheetVariants['side']
  hideClose?: boolean
}

const props = withDefaults(defineProps<Props>(), { side: 'right' })
const emits = defineEmits<DialogContentEmits>()

const forwarded = useForwardPropsEmits(
  () => ({ ...props, class: undefined, side: undefined, hideClose: undefined }),
  emits,
)
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogContent v-bind="forwarded" :class="cn(sheetVariants({ side }), $props.class)">
      <slot />
      <DialogClose
        v-if="!hideClose"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Fechar</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
