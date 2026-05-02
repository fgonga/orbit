<script setup lang="ts">
import { AvatarImage, type AvatarImageProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<AvatarImageProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>
<template>
  <AvatarImage v-bind="forwarded" :class="cn('aspect-square h-full w-full', $props.class)" />
</template>
