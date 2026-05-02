<script setup lang="ts">
import { SelectValue, type SelectValueProps, useForwardProps } from 'radix-vue'
const props = defineProps<SelectValueProps>()
</script>
<template>
  <SelectValue v-bind="useForwardProps(props)">
    <slot />
  </SelectValue>
</template>
