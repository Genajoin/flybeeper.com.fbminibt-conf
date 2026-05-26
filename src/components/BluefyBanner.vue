<script setup lang="ts">
const { t } = useI18n()

const DISMISS_KEY = 'fb:bluefy-banner-dismissed-v1'

const dismissed = ref(false)

const isIosSafariWithoutBluetooth = computed(() => {
  if (typeof navigator === 'undefined')
    return false
  if ('bluetooth' in navigator)
    return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
})

const show = computed(() => isIosSafariWithoutBluetooth.value && !dismissed.value)

const bluefyHref = computed(() => {
  if (typeof window === 'undefined')
    return 'bluefy://'
  return `bluefy://open?url=${encodeURIComponent(window.location.href)}`
})

onMounted(() => {
  if (typeof window === 'undefined')
    return
  dismissed.value = window.localStorage.getItem(DISMISS_KEY) === '1'
})

function dismiss() {
  dismissed.value = true
  if (typeof window !== 'undefined')
    window.localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<template>
  <Transition name="bluefy">
    <CkBannerRow
      v-if="show"
      class="bluefy"
      accent="var(--ck-signal)"
      :eyebrow="t('pair.ios-eyebrow')"
      :title="t('pair.ios-title')"
      :sub="t('pair.ios-sub')"
    >
      <template #actions>
        <a class="btn-primary" :href="bluefyHref">{{ t('pair.open-bluefy') }}</a>
        <button type="button" @click="dismiss">
          {{ t('local.dismiss') }}
        </button>
      </template>
    </CkBannerRow>
  </Transition>
</template>

<style scoped>
.bluefy {
  position: sticky;
  top: 0;
  z-index: 9;
}

.bluefy-enter-active,
.bluefy-leave-active {
  transition:
    transform var(--ck-dur-panel) var(--ck-ease),
    opacity var(--ck-dur-panel) var(--ck-ease);
}

.bluefy-enter-from,
.bluefy-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
