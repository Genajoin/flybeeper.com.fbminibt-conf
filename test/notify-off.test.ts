import { afterEach, describe, expect, it, vi } from 'vitest'
import { BleCharacteristicImpl, NOTIFY_OFF_DELAY_MS } from '../src/utils/BleCharacteristic'

function notifyingChar() {
  const char: any = {
    uuid: '00002a6d-0000-1000-8000-00805f9b34fb',
    properties: { read: true, notify: true },
    service: { uuid: 'env', device: { gatt: { connected: true } } },
    startNotifications: vi.fn(async () => char),
    stopNotifications: vi.fn(async () => char),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  return char
}

describe('notifications follow their subscribers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('turns the CCC off on the device once the last subscriber leaves', async () => {
    vi.useFakeTimers()
    const char = notifyingChar()
    const ch = new BleCharacteristicImpl(char)
    const a = () => {}
    const b = () => {}
    ch.subscribe(a)
    ch.subscribe(b)
    await ch.subscribeToNotifications()

    ch.unsubscribe(a)
    await vi.advanceTimersByTimeAsync(NOTIFY_OFF_DELAY_MS + 10)
    expect(char.stopNotifications).not.toHaveBeenCalled()

    ch.unsubscribe(b)
    await vi.advanceTimersByTimeAsync(NOTIFY_OFF_DELAY_MS + 10)
    expect(char.stopNotifications).toHaveBeenCalledTimes(1)
    expect(ch.isNotified).toBe(false)
  })

  it('keeps the stream when a page re-subscribes within the grace period', async () => {
    vi.useFakeTimers()
    const char = notifyingChar()
    const ch = new BleCharacteristicImpl(char)
    const a = () => {}
    ch.subscribe(a)
    await ch.subscribeToNotifications()

    ch.unsubscribe(a)
    ch.subscribe(() => {})
    await vi.advanceTimersByTimeAsync(NOTIFY_OFF_DELAY_MS + 10)
    expect(char.stopNotifications).not.toHaveBeenCalled()
    expect(ch.isNotified).toBe(true)
  })

  it('ignores an unsubscribe of a callback it never had', async () => {
    vi.useFakeTimers()
    const char = notifyingChar()
    const ch = new BleCharacteristicImpl(char)
    await ch.subscribeToNotifications()
    ch.unsubscribe(() => {})
    await vi.advanceTimersByTimeAsync(NOTIFY_OFF_DELAY_MS + 10)
    expect(char.stopNotifications).not.toHaveBeenCalled()
  })
})
