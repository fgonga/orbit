<script setup lang="ts">
import { AvatarRoot, type AvatarRootProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<AvatarRootProps & { class?: string }>()
</script>
<template>
  <AvatarRoot :class="cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full', $props.class)">
    <slot />
  </AvatarRoot>
</template>
