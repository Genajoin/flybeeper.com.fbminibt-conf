import log from 'loglevel'
import type { UserModule } from '~/types'
import { recordLog } from '~/utils/sessionLog'

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

/**
 * Mirror every enabled log call into the session buffer the diagnostics
 * report attaches. Installed before setLevel — loglevel rebuilds its methods
 * through this factory on every level change.
 */
function captureToSessionLog(): void {
  const original = log.methodFactory
  log.methodFactory = (methodName, level, loggerName) => {
    const raw = original(methodName, level, loggerName)
    return (...args: unknown[]) => {
      recordLog(methodName, args)
      raw(...args)
    }
  }
}

export const install: UserModule = () => {
  if (typeof window !== 'undefined') {
    captureToSessionLog()
    window.addEventListener('unhandledrejection', ev => recordLog('error', ['unhandled rejection:', ev.reason]))
    window.addEventListener('error', ev => recordLog('error', ['uncaught:', ev.error ?? ev.message]))
  }
  if (__DEBUG__ || debugRequested()) {
    log.setLevel(log.levels.DEBUG)
    log.info('loglevel: debug')
  }
  else {
    log.setLevel(log.levels.WARN)
  }
}
