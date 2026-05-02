<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template>
  <div :class="cn('col-start-2 text-sm text-muted-foreground [&_p]:leading-relaxed', $props.class)">
    <slot />
  </div>
</template>
