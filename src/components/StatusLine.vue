<script setup lang="ts">
import { computed } from 'vue'

const bt = useBluetoothStore()
const router = useRouter()

const device = computed(() => bt.devName || (bt.dis.modelNumberString.value as string | null) || '')
const fw = computed(() => (bt.dis.firmwareRevisionString.value as string | null) || null)

function goDashboard() {
  if (bt.isConnected)
    router.push('/cockpit')
}
</script>

<template>
  <div v-if="bt.isConnected" class="status-line">
    <button class="status-line__seg status-line__device" type="button" @click="goDashboard">
      <span class="status-line__dot" />
      <span class="status-line__device-name">{{ device || 'CONNECTED' }}</span>
    </button>
    <span class="status-line__spacer" />
    <span v-if="fw" class="status-line__seg">
      <span class="status-line__label">FW</span>
      <span class="status-line__value">{{ fw }}</span>
    </span>
    <UtilityToggles class="status-line__seg status-line__utils" />
  </div>
</template>

<style scoped>
.status-line {
  display: flex;
  align-items: stretch;
  background: var(--ck-paper);
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-mono);
  position: sticky;
  top: 0;
  z-index: 5;
}

.status-line__seg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  background: var(--ck-paper);
  color: var(--ck-ink);
  font-family: var(--ck-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.status-line__device {
  padding: 10px 14px;
  border-left: none;
  border-right: var(--ck-stroke-rule) solid var(--ck-ink);
  border-top: none;
  border-bottom: none;
  cursor: pointer;
  text-transform: uppercase;
}

.status-line__device:hover {
  background: var(--ck-bg-deep);
}

.status-line__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ck-signal);
}

.status-line__device-name {
  font-size: 11px;
}

.status-line__spacer {
  flex: 1;
}

.status-line__label {
  color: var(--ck-dim);
  font-size: 10px;
  letter-spacing: 1px;
}

.status-line__value {
  font-size: 11px;
  font-weight: 700;
}

.status-line__utils {
  padding: 0;
}
</style>
