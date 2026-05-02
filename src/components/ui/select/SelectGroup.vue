<script setup lang="ts">
import { SelectGroup, type SelectGroupProps, useForwardProps } from 'radix-vue'
const props = defineProps<SelectGroupProps>()
</script>
<template>
  <SelectGroup v-bind="useForwardProps(props)">
    <slot />
  </SelectGroup>
</template>
