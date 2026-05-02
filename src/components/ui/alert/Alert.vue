<script setup lang="ts">
import { cn } from '@/lib/utils'
import { alertVariants, type AlertVariants } from '.'
defineProps<{ variant?: AlertVariants['variant']; class?: string }>()
</script>
<template>
  <div role="alert" :class="cn(alertVariants({ variant }), $props.class)">
    <slot />
  </div>
</template>
