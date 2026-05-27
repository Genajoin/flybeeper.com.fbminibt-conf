<script setup lang="ts">
import { onMounted } from 'vue'
import { readPresetFromUrl } from '~/utils/preset-share'
import { useSharedPresetStore } from '~/stores/shared-preset'

useHead({
  title: 'FlyBeeper Configurator',
  meta: [
    {
      name: 'description',
      content: 'Change settings of FlyBeeper device with bluetooth',
    },
    {
      name: 'theme-color',
      content: () => isDark.value ? '#000000' : '#ffffff',
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: () => preferredDark.value ? '/favicon-dark.svg' : '/favicon.svg',
    },
  ],
})

const shared = useSharedPresetStore()

onMounted(() => {
  if (typeof window === 'undefined')
    return
  const preset = readPresetFromUrl(window.location.hash)
  if (preset)
    shared.stage(preset)
})
</script>

<template>
  <RouterView />
</template>
