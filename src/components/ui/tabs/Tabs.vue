<script setup lang="ts">
import { TabsRoot, type TabsRootEmits, type TabsRootProps, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<TabsRootProps & { class?: string }>()
const emits = defineEmits<TabsRootEmits>()
const forwarded = useForwardPropsEmits(() => ({ ...props, class: undefined }), emits)
</script>

<template>
  <TabsRoot v-bind="forwarded" :class="cn('', $props.class)">
    <slot />
  </TabsRoot>
</template>
