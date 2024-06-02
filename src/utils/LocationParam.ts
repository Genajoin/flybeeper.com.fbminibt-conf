export interface LogEntry {
  timestamp: number // Метка времени
  value: any // Значение
}

export interface LocParam {
  description?: string
  entryArray: LogEntry[]
}

export class LocParamImpl implements LocParam {
  description: string = ''
  entryArray: LogEntry[] = []
  constructor(description: string) {
    this.description = description
  }
}
