import type { StorageReader } from '../../platform/storage-port'
import { readSampleCollection } from './sampleCollection'

export function activeRecordWork(storage: StorageReader) {
  return readSampleCollection(storage).samples.filter(item => !item.archived).map(item => ({ sampleId: item.id, zone: item.zone, ledger: item.ledger }))
}
export function selectedRecordWork(storage: StorageReader, id: string) {
  const record = activeRecordWork(storage).find(item => item.sampleId === id)
  if (!record) throw new Error('Active record not found.')
  return record
}
