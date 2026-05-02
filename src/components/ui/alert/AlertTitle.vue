<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template>
  <h5 :class="cn('col-start-2 font-medium tracking-tight leading-none', $props.class)">
    <slot />
  </h5>
</template>
