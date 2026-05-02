<template>
  <Button
    :variant="shadcnVariant"
    :size="sm ? 'sm' : 'default'"
    :class="cn(full && 'w-full', $attrs.class as string)"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <Loader2 v-if="loading" class="h-3.5 w-3.5 animate-spin" />
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'success'
  sm?: boolean
  full?: boolean
  disabled?: boolean
  loading?: boolean
}>(), { variant: 'default' })

const shadcnVariant = computed(() => {
  switch (props.variant) {
    case 'primary': return 'default'
    case 'danger': return 'destructive'
    case 'success': return 'success'
    case 'ghost': return 'ghost'
    default: return 'outline'
  }
})
</script>
