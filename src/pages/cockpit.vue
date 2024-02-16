<template>
  <Suspense>
    <TheParams />
    <template #fallback>
      Loading...
    </template>
  </Suspense>
  <noSleep />
</template>
