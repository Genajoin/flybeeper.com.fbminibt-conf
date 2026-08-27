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

/**
 * Escape hatch for a browser stuck on an old build.
 *
 * The UPDATE banner only appears once the browser has *noticed* a new worker,
 * and on a phone that can take days — an installed PWA is resumed, not
 * reloaded, and pull-to-reload does not touch the service-worker cache. So the
 * footer gets an unconditional escape hatch: drop every cache, unregister the
 * worker, come back from the network. Settings live in IndexedDB and survive.
 */
const { hardReload } = useSwUpdate()
const updating = ref(false)

async function forceUpdate() {
  if (updating.value)
    return
  updating.value = true
  await hardReload()
}
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
      <!-- A plain <a>, not a button, and deliberately not a RouterLink: when
           the bundle failed to load there is no Vue to handle a click, and
           navigating to ?reset=1 still reaches the inline cleanup script in
           index.html. With Vue alive the handler below does the same thing in
           one navigation instead of two. -->
      <a
        class="ftr__link ftr__update" href="?reset=1"
        :title="t('footer.force-update-hint')" @click.prevent="forceUpdate"
      >
        {{ updating ? t('footer.updating') : t('footer.force-update') }}
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

/* The one footer cell that is an action, so it carries the signal colour —
   a user hunting for "how do I update this thing" has to find it without
   being told where to look. Full-width row of its own on a phone, like the
   build id under it. */
.ftr__update {
  flex: 1 1 100%;
  min-width: 100%;
  border-right: none;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  color: var(--ck-signal);
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
  .ftr__update {
    flex: 0 1 auto;
    min-width: 0;
    margin-left: auto;
    border-right: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
  }
  .ftr__build {
    flex: 0 0 auto;
    min-width: 0;
    border-bottom: none;
    border-left: var(--ck-stroke-rule) solid rgba(255, 255, 255, 0.16);
    text-align: right;
  }
  .ftr__link:last-child {
    border-right: none;
  }
}
</style>
