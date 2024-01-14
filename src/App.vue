<script setup lang="ts">
useHead({
  title: 'FlyBeeper mini BT',
  meta: [
    {
      name: 'description',
      content: 'Variometer with bluetooth',
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
