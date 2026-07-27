/**
 * Minimal MCUmgr / SMP client for Web Bluetooth — enough to flash a Zephyr
 * device from the browser over an already-open GATT connection.
 *
 * Portable by design: plain TypeScript, no Vue, no Pinia, no app imports. The
 * only external object it touches is a BluetoothRemoteGATTCharacteristic.
 */

export * from './codec'
export * from './transport'
export * from './image'
export * from './os'
