import log from 'loglevel'
import type { UserModule } from '~/types'

// import {env} from 'process';

export const install: UserModule = () => {
  if (__DEBUG__) {
    log.setLevel(log.levels.DEBUG)
    log.info('loglevel: debug')
  }
  else {
    log.setLevel(log.levels.ERROR)
    // log.error('loglevel: err');
  }
}
