<script setup lang="ts">
import { useSharedPresetStore } from '~/stores/shared-preset'
import { useSettingsStore } from '~/stores/settings'

const shared = useSharedPresetStore()
const settings = useSettingsStore()
const { t } = useI18n()

function apply() {
  if (!shared.pending)
    return
  settings.replaceLocal(shared.pending.settings)
  shared.clear()
}

function discard() {
  shared.clear()
}
</script>

<template>
  <Transition name="preset-imp">
    <div v-if="shared.pending" class="banner-row">
      <div class="banner-row__stripe" />
      <div class="banner-row__body">
        <CkEyebrow color="var(--ck-signal)">
          {{ t('preset.import-eyebrow') }}
        </CkEyebrow>
        <div class="banner-row__title">
          {{ shared.pending.name || t('preset.import-default-name') }}
        </div>
        <div class="banner-row__sub">
          {{ shared.pending.bytes }} {{ t('preset.bytes') }} · {{ t('preset.via-url') }}
        </div>
        <div class="banner-row__actions">
          <button class="banner-row__primary" type="button" @click="apply">
            {{ t('preset.apply') }}
          </button>
          <button class="banner-row__secondary" type="button" @click="discard">
            {{ t('preset.discard') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.banner-row {
  display: flex;
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: none;
  border-right: none;
  font-family: var(--ck-font-body);
}

.banner-row__stripe {
  width: 8px;
  background: var(--ck-signal);
  flex-shrink: 0;
}

.banner-row__body {
  flex: 1;
  padding: 12px 14px;
}

.banner-row__title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 16px;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
}

.banner-row__sub {
  font-size: 11px;
  color: var(--ck-dim);
  margin-top: 3px;
  line-height: 1.4;
}

.banner-row__actions {
  display: flex;
  margin-top: 9px;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  width: max-content;
}

.banner-row__primary,
.banner-row__secondary {
  padding: 6px 11px;
  font-family: var(--ck-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
  border: none;
  background: var(--ck-paper);
  color: var(--ck-ink);
  cursor: pointer;
  border-radius: 0;
}

.banner-row__primary {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
}

.banner-row__secondary {
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
}

.preset-imp-enter-active,
.preset-imp-leave-active {
  transition: opacity var(--ck-dur-panel) var(--ck-ease);
}

.preset-imp-enter-from,
.preset-imp-leave-to {
  opacity: 0;
}
</style>
