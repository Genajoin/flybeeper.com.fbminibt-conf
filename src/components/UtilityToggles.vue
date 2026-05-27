<script setup lang="ts">
import { availableLocales, loadLanguageAsync } from '~/modules/i18n'

const { t, locale } = useI18n()

async function toggleLocales() {
  const locales = availableLocales
  const next = locales[(locales.indexOf(locale.value) + 1) % locales.length]
  await loadLanguageAsync(next)
  locale.value = next
}
</script>

<template>
  <div class="utils">
    <RouterLink class="utils__btn" :title="t('dashboard.share')" to="/share">
      <Icon name="share" :size="16" />
    </RouterLink>
    <button class="utils__btn" :title="t('button.toggle_dark')" type="button" @click="toggleDark()">
      <Icon :name="isDark ? 'moon' : 'sun'" :size="16" />
    </button>
    <button class="utils__btn" :title="t('button.toggle_langs')" type="button" @click="toggleLocales">
      <Icon name="language" :size="16" />
      <span class="utils__label">{{ locale }}</span>
    </button>
  </div>
</template>

<style scoped>
.utils {
  display: inline-flex;
  align-items: stretch;
}

.utils__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--ck-paper);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  color: var(--ck-ink);
  cursor: pointer;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  font-weight: 700;
  border-radius: 0;
  text-decoration: none;
}

.utils__btn:hover {
  background: var(--ck-bg-deep);
}

.utils__btn--bt-on {
  color: var(--ck-signal);
}

.utils__label {
  font-size: 9px;
}
</style>
