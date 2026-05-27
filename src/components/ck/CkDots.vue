<script setup lang="ts">
/**
 * Animated ellipsis. Cycles "." → ".." → "..." → "" over 1.2 s.
 * Inline next to loading labels (e.g. "CONNECTING<CkDots/>").
 *
 * Width is reserved as 3ch so the surrounding line doesn't jump.
 */
</script>

<template>
  <span class="ck-dots" aria-hidden="true" />
</template>

<style scoped>
.ck-dots {
  display: inline-block;
  width: 1.4em;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.ck-dots::after {
  content: '.';
  animation: ck-dots-cycle 1.2s steps(1, end) infinite;
}

@keyframes ck-dots-cycle {
  0% {
    content: '.';
  }
  25% {
    content: '..';
  }
  50% {
    content: '...';
  }
  75% {
    content: '\00a0';
  }
}
</style>
