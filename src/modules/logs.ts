import log from 'loglevel'
import type { UserModule } from '~/types'

// Диагностика на проде включается вручную: `?debug=1` в адресе (запоминается)
// или `localStorage.setItem('fb:debug', '1')`; `?debug=0` выключает.
//
// ПОЧЕМУ НЕ SILENT. Прод стоял на SILENT, и когда у пользователя после OTA не
// поднялись настройки, консоль молчала — ни одного нашего сообщения, только
// чужие. Разбираться было не с чем. WARN/ERROR почти ничего не печатают в
// нормальной работе, зато на сломанном подключении сразу видно, что именно
// не нашлось.
function debugRequested(): boolean {
  if (typeof window === 'undefined')
    return false
  try {
    const flag = new URLSearchParams(window.location.search).get('debug')
    if (flag !== null) {
      const on = flag !== '0' && flag !== 'false'
      localStorage.setItem('fb:debug', on ? '1' : '0')
      return on
    }
    return localStorage.getItem('fb:debug') === '1'
  }
  catch {
    return false
  }
}

export const install: UserModule = () => {
  if (__DEBUG__ || debugRequested()) {
    log.setLevel(log.levels.DEBUG)
    log.info('loglevel: debug')
  }
  else {
    log.setLevel(log.levels.WARN)
  }
}
