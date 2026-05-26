<script setup lang="ts">
const { t } = useI18n()
const cpfChars = useCpfGroup('audio')

// Buzzer volume is the one scalar characteristic that should get a 4-way
// segmented control (✕ / 1 / 2 / 3). Everything else is a numeric threshold
// rendered inline by TheSetting.
const VOLUME_UUID = '67f82d94-2b2a-4123-81c9-058e460c3d01'

const volumeChar = computed(() => cpfChars.value.find(c => c.characteristic.uuid === VOLUME_UUID))
const otherChars = computed(() => cpfChars.value.filter(c => c.characteristic.uuid !== VOLUME_UUID))

const volumeValue = computed<number>(() => {
  const v = volumeChar.value?.formattedValue
  return typeof v === 'number' ? v : 0
})

function setVolume(v: number) {
  if (!volumeChar.value)
    return
  volumeChar.value.formattedValue = v
}
</script>

<template>
  <SettingsPanel group="audio" :cpf-chars="cpfChars">
    <div class="audio-source">
      <CkEyebrow block>
        {{ t('audio.source-label') }}
      </CkEyebrow>
      <AudioSourceToggle class="audio-source__ctl" />
    </div>

    <div v-if="volumeChar" class="audio-volume">
      <CkEyebrow block>
        {{ t('sett.buzz-vol') }}
      </CkEyebrow>
      <div class="audio-volume__seg">
        <button
          v-for="v in 4"
          :key="v"
          type="button"
          class="audio-volume__btn"
          :class="{ 'audio-volume__btn--active': volumeValue === v - 1 }"
          @click="setVolume(v - 1)"
        >
          {{ v - 1 === 0 ? '✕' : v - 1 }}
        </button>
      </div>
    </div>

    <div v-if="otherChars.length" class="audio-thresholds">
      <CkEyebrow block>
        {{ t('sett.group-audio') }}
      </CkEyebrow>
      <TheSetting
        v-for="ch in otherChars"
        :key="ch.characteristic.uuid"
        :cha="ch"
      />
    </div>

    <p v-if="cpfChars.length === 0" class="empty">
      {{ t('msg.fetching') }}…
    </p>
  </SettingsPanel>
</template>

<style scoped>
.audio-source,
.audio-volume,
.audio-thresholds {
  padding: 18px 22px;
  border-bottom: var(--ck-stroke-rule) solid var(--ck-ink);
}

.audio-source__ctl {
  margin-top: 8px;
}

.audio-volume__seg {
  display: flex;
  border: var(--ck-stroke-rule) solid var(--ck-ink);
  margin-top: 10px;
}

.audio-volume__btn {
  flex: 1;
  padding: 16px 0;
  background: var(--ck-paper);
  color: var(--ck-ink);
  border: none;
  border-left: var(--ck-stroke-rule) solid var(--ck-ink);
  font-family: var(--ck-font-display);
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
  border-radius: 0;
}

.audio-volume__btn:first-child {
  border-left: none;
}

.audio-volume__btn--active {
  background: var(--ck-ink);
  color: var(--ck-paper);
}

.empty {
  font-family: var(--ck-font-mono);
  font-size: var(--ck-fs-meta);
  color: var(--ck-dim);
  margin: 0;
  padding: 22px;
  text-align: center;
}
</style>
