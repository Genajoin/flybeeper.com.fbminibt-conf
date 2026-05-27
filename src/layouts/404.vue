<script setup lang="ts">
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <main class="error">
    <div class="error__panel">
      <Icon name="alert" :size="48" class="error__icon" stroke="var(--ck-signal)" />
      <RouterView />
      <button class="error__btn" @click="router.back()">
        {{ t('button.back') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.error {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ck-s-lg);
  background: var(--ck-bg);
  color: var(--ck-ink);
}

.error__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ck-s-md);
  padding: var(--ck-s-xl) var(--ck-s-lg);
  background: var(--ck-paper);
  border: var(--ck-stroke-rule) solid var(--ck-grid);
  border-radius: var(--ck-radius-soft);
  text-align: center;
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  max-width: 28rem;
}

.error__icon {
  display: block;
  width: 48px;
  height: 48px;
  color: var(--ck-signal);
}

.error__btn {
  font-family: var(--ck-font-body);
  font-size: var(--ck-fs-body);
  font-weight: 600;
  padding: var(--ck-s-sm) var(--ck-s-md);
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  border-radius: var(--ck-radius-soft);
  cursor: pointer;
  margin-top: var(--ck-s-sm);
}

.error__btn:hover {
  background: var(--ck-ink);
  color: var(--ck-paper);
}
</style>
