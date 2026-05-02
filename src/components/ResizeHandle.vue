<template>
  <div
    class="w-[3px] flex-shrink-0 cursor-col-resize bg-transparent transition-colors relative z-10 hover:bg-primary/40 after:content-[''] after:absolute after:inset-y-0 after:-left-1 after:-right-1"
    :class="{ '!bg-primary/40': dragging }"
    @mousedown.prevent="startDrag"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ resize: [delta: number] }>()

const dragging = ref(false)

function startDrag(e: MouseEvent) {
  dragging.value = true
  let lastX = e.clientX

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMove(e: MouseEvent) {
    const delta = e.clientX - lastX
    lastX = e.clientX
    if (delta !== 0) emit('resize', delta)
  }

  function onUp() {
    dragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>
