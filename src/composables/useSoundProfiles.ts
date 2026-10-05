import { StorageSerializers } from '@vueuse/core'
import type { SettingsLocal } from '~/stores/settings'
import type { ProfileScope, SoundProfile } from '~/utils/sound-profiles'
import { matchProfile, newProfileId, pickScope, uniqueName } from '~/utils/sound-profiles'

/**
 * The pilot's sound profiles, one list per browser (localStorage). Nothing
 * goes to a server: clearing site data or switching browsers loses them,
 * which is why every profile can be downloaded as JSON.
 */
export const useSoundProfiles = createGlobalState(() => {
  const list = useLocalStorage<SoundProfile[]>('sound-profiles', [], { serializer: StorageSerializers.object })
  const settings = useSettingsStore()

  function save(name: string, bag: SettingsLocal, savedAt = Date.now()): SoundProfile {
    const p: SoundProfile = {
      id: newProfileId(),
      name: uniqueName(name, list.value),
      savedAt,
      settings: JSON.parse(JSON.stringify(bag)),
    }
    list.value = [...list.value, p]
    return p
  }

  function rename(id: string, name: string) {
    list.value = list.value.map(p => (p.id === id ? { ...p, name: uniqueName(name, list.value, id) } : p))
  }

  function remove(id: string) {
    list.value = list.value.filter(p => p.id !== id)
  }

  function inScope(scope: ProfileScope): SoundProfile[] {
    return list.value.filter(p => pickScope(p.settings, scope) !== null)
  }

  function active(scope: ProfileScope): SoundProfile | null {
    return matchProfile(list.value, settings.local, scope)
  }

  /** Write the profile's part for this scope into the settings; the rest of it stays put. */
  function apply(p: SoundProfile, scope: ProfileScope) {
    const part = pickScope(p.settings, scope)
    if (part)
      settings.mergeLocal(part)
  }

  return { list, save, rename, remove, inScope, active, apply }
})
