<template>
  <TooltipProvider>
    <RouterView />
    <DiffViewer v-if="gitStore.diffPane" />
    <Toaster />
  </TooltipProvider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import DiffViewer from '@/components/DiffViewer.vue'
import { useGitStore } from '@/stores/git'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

const gitStore = useGitStore()
</script>
