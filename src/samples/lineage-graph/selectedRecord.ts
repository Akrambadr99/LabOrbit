import type { StoragePort } from '../../workspace/repository'
import { bindRecord } from '../../workspace/recordStorage'
import { readSampleCollection, saveSampleCollection } from './sampleCollection'
import { readSampleLedger } from './sampleLedger'

export function openSelectedRecord(storage: StoragePort, id = 'B-91') {
  return bindRecord(storage, id, {
    key: 'laborbit:sample:SMP-2048:lineage:v1',
    collectionKey: 'laborbit:sample-collection:v1',
    read: readSampleCollection, save: saveSampleCollection,
    find: (collection, target) => collection.samples.find(item => item.id === target),
    value: record => record.ledger, archived: record => record.archived,
    replace: (collection, target, raw) => {
      const value = readSampleLedger({ getItem: () => raw, setItem: () => { throw new Error('Read only decoder.') } })
      return { ...collection, samples: collection.samples.map(item => item.id === target ? { ...item, ledger: value } : item),
        audit: [...collection.audit, { action: 'detail-updated', id: target, related: [] }] }
    },
  })
}
