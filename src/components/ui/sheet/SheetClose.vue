<script setup lang="ts">
import { DialogClose, type DialogCloseProps } from 'radix-vue'
const props = defineProps<DialogCloseProps & { class?: string }>()
</script>
<template>
  <DialogClose v-bind="props" :class="$props.class">
    <slot />
  </DialogClose>
</template>
