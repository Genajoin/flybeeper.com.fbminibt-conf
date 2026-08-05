<script setup lang="ts">
const { t } = useI18n()

/**
 * Build identity. Support could not ask "which version do you have?" — there
 * is no release tag and no version field anywhere, so the commit hash of the
 * build is the only unambiguous answer. Tap to copy, same reasoning as the
 * device id in DeviceInfoStrip.
 */
const build = `${__APP_VERSION__} · ${__BUILD_DATE__}`
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copyBuild() {
  try {
    await navigator.clipboard?.writeText(build)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = false), 1500)
  }
  catch { /* clipboard blocked — the string is on screen anyway */ }
}

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <footer class="ftr">
    <nav class="ftr__links">
      <RouterLink class="ftr__link" to="/about">
        {{ t('footer.about') }}
      </RouterLink>
      <RouterLink class="ftr__link" to="/devices">
        {{ t('footer.devices') }}
      </RouterLink>
      <RouterLink class="ftr__link" to="/update">
        {{ t('footer.firmware-update') }}
      </RouterLink>
      <a class="ftr__link ftr__link--ext" href="https://alpisto.eu" target="_blank" rel="noopener">
        {{ t('footer.alpisto') }}
      </a>
      <!-- Same row as the links, as its own cell — the build id is a footer
           entry, not a separate strip under one. -->
      <button class="ftr__link ftr__build" type="button" :title="t('footer.copy-build')" @click="copyBuild">
        {{ copied ? t('dashboard.copied') : `${t('footer.build')} ${build}` }}
      </button>
    </nav>
  </footer>
</template>

<style scoped>
.ftr {
  background: var(--ck-ink);
  color: var(--ck-paper);
  border-top: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-body);
}

.ftr__links {
  display: flex;
  flex-wrap: wrap;
}

.ftr__link {
  flex: 1 1 50%;
  min-width: 50%;
  padding: 14px 18px;
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  color: var(--ck-paper);
  text-decoration: none;
  background: var(--ck-ink);
  border-right: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
  border-bottom: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
}

.ftr__link:nth-child(2n) {
  border-right: none;
}

.ftr__link:hover {
  color: var(--ck-signal);
  background: rgba(255, 255, 255, 0.04);
}

/* Takes the .ftr__link cell (padding, borders, mono type) and only drops the
   emphasis — it is an identifier, not a navigation target. Declared after
   .ftr__link so these win at equal specificity. Narrow viewports: full-width
   cell closing the grid; from 720px it joins the links row, pushed right. */
.ftr__build {
  flex: 1 1 100%;
  min-width: 100%;
  border-top: none;
  border-left: none;
  border-right: none;
  cursor: pointer;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
  text-align: left;
}

@media (min-width: 720px) {
  .ftr__link {
    flex: 0 1 auto;
    min-width: 0;
    border-bottom: none;
  }
  .ftr__link:nth-child(2n) {
    border-right: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
  }
  .ftr__build {
    flex: 0 0 auto;
    min-width: 0;
    margin-left: auto;
    border-bottom: none;
    border-left: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
    text-align: right;
  }
  .ftr__link:last-child {
    border-right: none;
  }
}
</style>
