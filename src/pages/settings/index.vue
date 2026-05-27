<script setup lang="ts">
import { useInstallPrompt } from '~/composables/useInstallPrompt'
import { CPF_UUID_TO_GROUP, type SettingsGroupKey } from '~/composables/useSettingsGroups'

const { t } = useI18n()
const bt = useBluetoothStore()
const { canInstall, install } = useInstallPrompt()

const fw = computed(() => (bt.dis.firmwareRevisionString.value as string | null) ?? '—')

interface Row {
  to?: string
  href?: string
  label: string
  sub: string
  signal?: boolean
  action?: () => void
  /** When set, the row is hidden if the device exposes no chars in this group. */
  conditionalGroup?: SettingsGroupKey
}

/**
 * Which groups the connected device actually exposes. Driven by the real
 * bleCharacteristics list — offline (demo mode) we treat every group as
 * present so the user can still browse settings without hardware.
 */
const presentGroups = computed<Set<SettingsGroupKey>>(() => {
  if (!bt.isConnected)
    return new Set<SettingsGroupKey>(Object.values(CPF_UUID_TO_GROUP))
  const out = new Set<SettingsGroupKey>()
  for (const ch of bt.bleCharacteristics) {
    const g = CPF_UUID_TO_GROUP[ch.characteristic.uuid]
    if (g)
      out.add(g)
  }
  return out
})

const rows = computed<Row[]>(() => {
  const out: Row[] = [
    { to: '/settings/audio', label: t('dashboard.hub-sound'), sub: t('dashboard.hub-sound-sub'), conditionalGroup: 'audio' },
    { to: '/settings/behaviour', label: t('dashboard.hub-behaviour'), sub: t('dashboard.hub-behaviour-sub'), conditionalGroup: 'behaviour' },
    { to: '/settings/fanet', label: t('sett.group-fanet'), sub: t('sett.group-fanet-desc'), conditionalGroup: 'fanet' },
    { to: '/settings/tas', label: t('sett.group-tas'), sub: t('sett.group-tas-desc'), conditionalGroup: 'tas' },
    { to: '/settings/power', label: t('dashboard.hub-power'), sub: t('dashboard.hub-power-sub'), conditionalGroup: 'power' },
    { to: '/settings/uart', label: t('dashboard.hub-uart'), sub: t('dashboard.hub-uart-sub'), conditionalGroup: 'uart' },
    { to: '/update', label: t('dashboard.hub-firmware'), sub: t('dashboard.hub-firmware-sub', { v: fw.value }) },
    { to: '/terminal', label: t('dashboard.hub-terminal'), sub: t('dashboard.hub-terminal-sub') },
  ].filter(r => !r.conditionalGroup || presentGroups.value.has(r.conditionalGroup))
  if (canInstall.value) {
    out.push({
      label: t('install.hub-row'),
      sub: t('install.title'),
      signal: true,
      action: () => install(),
    })
  }
  return out
})
</script>

<template>
  <section class="hub">
    <PageHeader
      :breadcrumb-to="bt.isConnected ? '/cockpit' : '/'"
      :breadcrumb-label="bt.isConnected ? t('dashboard.back-dashboard') : '← HOME'"
      :eyebrow="t('sett.group-audio')"
      :title="t('dashboard.settings-title')"
    >
      <template #right>
        <ConnectionPill />
      </template>
    </PageHeader>

    <ul class="hub__list">
      <li v-for="(row, i) in rows" :key="i" class="hub__row">
        <component
          :is="row.to ? 'router-link' : (row.href ? 'a' : 'button')"
          :to="row.to"
          :href="row.href"
          :type="!row.to && !row.href ? 'button' : undefined"
          class="hub__link"
          :class="{ 'hub__link--signal': row.signal }"
          @click="row.action && row.action()"
        >
          <div>
            <div class="hub__label">
              {{ row.label }}
            </div>
            <div class="hub__sub">
              {{ row.sub }}
            </div>
          </div>
          <span class="hub__arrow">→</span>
        </component>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hub {
  background: var(--ck-bg);
  display: flex;
  flex-direction: column;
}

.hub__list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--ck-paper);
}

.hub__row {
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.hub__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  width: 100%;
  text-decoration: none;
  color: var(--ck-ink);
  background: var(--ck-paper);
  font-family: var(--ck-font-body);
  cursor: pointer;
  border: none;
  text-align: left;
  border-radius: 0;
}

.hub__link:hover {
  background: var(--ck-bg-deep);
}

.hub__link--signal {
  color: var(--ck-signal);
}

.hub__label {
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.hub__sub {
  font-family: var(--ck-font-mono);
  font-size: 9px;
  color: var(--ck-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 2px;
}

.hub__arrow {
  font-family: var(--ck-font-mono);
  font-weight: 700;
}
</style>
