<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot, type CheckboxRootEmits, type CheckboxRootProps, useForwardPropsEmits } from 'radix-vue'
import { Check, Minus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<CheckboxRootProps & { class?: string }>()
const emits = defineEmits<CheckboxRootEmits>()

const forwarded = useForwardPropsEmits(() => ({ ...props, class: undefined }), emits)
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="cn('peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', $props.class)"
  >
    <CheckboxIndicator class="flex h-full w-full items-center justify-center text-current">
      <Check v-if="props.modelValue !== 'indeterminate'" class="h-3.5 w-3.5" :stroke-width="3" />
      <Minus v-else class="h-3.5 w-3.5" :stroke-width="3" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
