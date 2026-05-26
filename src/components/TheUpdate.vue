<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()

const steps = computed(() => [
  { t: t('update.step-1-title'), d: t('update.step-1-desc') },
  { t: t('update.step-2-title'), d: t('update.step-2-desc') },
  { t: t('update.step-3-title'), d: t('update.step-3-desc') },
  { t: t('update.step-4-title'), d: t('update.step-4-desc') },
  { t: t('update.step-5-title'), d: t('update.step-5-desc') },
  { t: t('update.step-6-title'), d: t('update.step-6-desc') },
])
</script>

<template>
  <div class="upd">
    <div class="upd__callout">
      <CkEyebrow color="var(--ck-signal)">
        {{ t('update.callout-eyebrow') }}
      </CkEyebrow>
      <p class="upd__callout-body">
        {{ t('update.callout-body') }}
      </p>
    </div>

    <div class="upd__steps">
      <div v-for="(s, i) in steps" :key="i" class="upd__step">
        <span class="upd__step-num" :class="{ 'upd__step-num--signal': i === steps.length - 1 }">
          0{{ i + 1 }}
        </span>
        <div class="upd__step-body">
          <div class="upd__step-title">
            {{ s.t }}
          </div>
          <div class="upd__step-desc">
            {{ s.d }}
          </div>
        </div>
      </div>
    </div>

    <div class="upd__ctas">
      <a class="upd__cta" href="https://apps.apple.com/app/nrf-connect-for-mobile/id1054362403" target="_blank" rel="noopener">{{ t('update.cta-ios') }}</a>
      <a class="upd__cta" href="https://play.google.com/store/apps/details?id=no.nordicsemi.android.mcp" target="_blank" rel="noopener">{{ t('update.cta-android') }}</a>
      <a class="upd__cta upd__cta--signal" href="https://flybeeper.com/firmware" target="_blank" rel="noopener">{{ t('update.cta-firmware') }}</a>
    </div>
  </div>
</template>

<style scoped>
.upd {
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.upd__callout {
  padding: 14px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  border-left: 8px solid var(--ck-signal);
}

.upd__callout-body {
  font-size: 12px;
  color: var(--ck-ink);
  line-height: 1.5;
  margin: 4px 0 0;
}

.upd__steps {
  display: flex;
  flex-direction: column;
}

.upd__step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 22px;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.upd__step-num {
  font-family: var(--ck-font-mono);
  font-size: 20px;
  font-weight: 700;
  color: var(--ck-ink);
  letter-spacing: -1px;
  line-height: 1;
  min-width: 36px;
}

.upd__step-num--signal {
  color: var(--ck-signal);
}

.upd__step-body {
  flex: 1;
}

.upd__step-title {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: -0.2px;
}

.upd__step-desc {
  font-size: 12px;
  color: var(--ck-dim);
  margin-top: 3px;
  line-height: 1.5;
}

.upd__ctas {
  display: flex;
}

.upd__cta {
  flex: 1;
  padding: 14px;
  text-align: center;
  text-decoration: none;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--ck-track-data);
  text-transform: uppercase;
}

.upd__cta:last-child {
  border-right: none;
}

.upd__cta--signal {
  background: var(--ck-signal);
  color: var(--ck-on-signal);
  flex: 1.2;
}

@media (min-width: 960px) {
  .upd__steps {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .upd__step {
    padding: 18px 28px;
  }
  .upd__step:nth-child(odd) {
    border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  }
  .upd__step-num {
    font-size: 26px;
  }
  .upd__step-title {
    font-size: 18px;
  }
}
</style>
