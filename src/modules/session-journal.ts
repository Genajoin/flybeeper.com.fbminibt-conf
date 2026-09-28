import type { UserModule } from '~/types'
import { startSessionJournal } from '~/composables/useDiagnostics'

/**
 * Start the in-memory diagnostics journal with the app, not with the
 * /diagnostics page: the pilot reproduces the problem first and opens the
 * page afterwards, so everything before that has to be on record already.
 * Client only — the prerender has no device and no pilot.
 *
 * Installed after modules/pinia.ts (glob order is alphabetical), so the
 * active pinia is already set when the stores are first used here.
 */
export const install: UserModule = ({ isClient, router }) => {
  if (isClient)
    startSessionJournal(router)
}
