<script setup lang="ts">
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
</script>

<template>
  <RouterView />
</template>
