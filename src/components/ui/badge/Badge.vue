<script setup lang="ts">
import { cn } from '@/lib/utils'
import { badgeVariants, type BadgeVariants } from '.'

defineProps<{ variant?: BadgeVariants['variant']; class?: string }>()
</script>

<template>
  <div :class="cn(badgeVariants({ variant }), $props.class)">
    <slot />
  </div>
</template>
