<script setup lang="ts">
import { availableLocales, loadLanguageAsync } from '~/modules/i18n'
import useBluetoothStore from '~/stores/bluetooth'

const { t, locale } = useI18n()
const bt = useBluetoothStore()

async function toggleLocales() {
  const locales = availableLocales
  const newLocale = locales[(locales.indexOf(locale.value) + 1) % locales.length]
  await loadLanguageAsync(newLocale)
  locale.value = newLocale
}

// BT state pill — three discrete states drive a different icon + colour.
const btState = computed<'connecting' | 'connected' | 'idle'>(() => {
  if (bt.isConnecting || bt.isDisconnecting)
    return 'connecting'
  if (bt.isConnected)
    return 'connected'
  return 'idle'
})
</script>

<template>
  <nav class="nav" aria-label="Primary">
    <div class="nav__inner">
      <div class="nav__group">
        <RouterLink class="nav__link" to="/" :title="t('button.home')">
          <span class="nav__icon i-carbon-campsite" />
        </RouterLink>

        <RouterLink class="nav__link" to="/settings" :title="t('button.settings')" data-test-id="settings">
          <span class="nav__icon i-carbon-settings-edit" />
        </RouterLink>

        <RouterLink class="nav__link" to="/cockpit" :title="t('button.cockpit')" data-test-id="cockpit">
          <span class="nav__icon i-carbon-meter" />
        </RouterLink>

        <RouterLink class="nav__link" to="/update" :title="t('button.update')" data-test-id="update">
          <span class="nav__icon i-carbon-update-now" />
        </RouterLink>

        <RouterLink class="nav__link" to="/terminal" :title="t('button.terminal')" data-test-id="terminal">
          <span class="nav__icon i-carbon-terminal" />
        </RouterLink>

        <RouterLink class="nav__link" to="/about" :title="t('button.about')" data-test-id="about">
          <span class="nav__icon i-carbon-information" />
        </RouterLink>
      </div>

      <div class="nav__divider" aria-hidden="true" />

      <div class="nav__group">
        <button class="nav__link" :title="t('button.toggle_dark')" @click="toggleDark()">
          <span class="nav__icon" :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" />
        </button>

        <button class="nav__link" :title="t('button.toggle_langs')" @click="toggleLocales()">
          <span class="nav__icon i-carbon-language" />
          <span class="nav__lang">{{ locale }}</span>
        </button>

        <button
          v-if="bt.bleAvailable"
          class="nav__link nav__link--bt"
          :class="{ 'nav__link--bt-on': btState === 'connected' }"
          :title="t('button.bluetooth')"
          @click="bt.toggleConnectionBT()"
        >
          <span
            class="nav__icon"
            :class="{
              'i-carbon-bluetooth-off': btState === 'idle',
              'i-carbon-bluetooth': btState === 'connected',
              'i-carbon-fade animate-spin': btState === 'connecting',
            }"
          />
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 4;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-hair) solid var(--ck-grid);
  font-family: var(--ck-font-mono);
}

.nav__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-sm);
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--ck-s-sm) var(--ck-s-md);
}

.nav__group {
  display: flex;
  align-items: center;
  gap: var(--ck-s-xs);
}

.nav__divider {
  width: var(--ck-stroke-hair);
  height: 20px;
  background: var(--ck-grid);
  margin: 0 var(--ck-s-xs);
}

.nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ck-s-xs);
  background: transparent;
  border: none;
  color: var(--ck-ink-dim);
  cursor: pointer;
  padding: var(--ck-s-xs) var(--ck-s-sm);
  border-radius: var(--ck-radius-soft);
  text-decoration: none;
  transition:
    color var(--ck-dur-toggle) var(--ck-ease),
    background var(--ck-dur-toggle) var(--ck-ease);
}

.nav__link:hover {
  color: var(--ck-ink);
  background: var(--ck-bg-deep);
}

.nav__icon {
  display: block;
  width: 20px;
  height: 20px;
}

.nav__lang {
  font-size: var(--ck-fs-micro);
  letter-spacing: var(--ck-track-eyebrow);
  text-transform: uppercase;
  font-weight: 700;
}

/* Vue Router auto-applies these classes to active links. */
.nav__link.router-link-active {
  color: var(--ck-signal);
}

.nav__link.router-link-active::after {
  content: '';
  position: absolute;
  left: var(--ck-s-sm);
  right: var(--ck-s-sm);
  bottom: -2px;
  height: 2px;
  background: var(--ck-signal);
  border-radius: var(--ck-radius-pill);
}

.nav__link--bt-on {
  color: var(--ck-signal);
}

@media (max-width: 480px) {
  .nav__inner {
    padding: var(--ck-s-xs) var(--ck-s-sm);
    gap: var(--ck-s-xs);
  }

  .nav__link {
    padding: var(--ck-s-xs);
  }

  .nav__lang {
    display: none;
  }

  .nav__divider {
    margin: 0;
  }
}
</style>
