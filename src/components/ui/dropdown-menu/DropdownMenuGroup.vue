<script setup lang="ts">
import { DropdownMenuGroup, type DropdownMenuGroupProps, useForwardProps } from 'radix-vue'
const props = defineProps<DropdownMenuGroupProps>()
</script>
<template>
  <DropdownMenuGroup v-bind="useForwardProps(props)">
    <slot />
  </DropdownMenuGroup>
</template>
