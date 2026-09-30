import type { SnapshotAdapter } from '../../workspace/collectionSnapshot'
import { sampleCollectionRule } from './collectionValidation'
import { readSampleCollection } from './sampleCollection'
import type { SampleCollection } from './sampleCollection'

export const collectionSnapshotAdapter: SnapshotAdapter<SampleCollection> = {
  product: 'LabOrbit', scope: 'sample-collection', label: 'Samples and freezer sources',
  read: readSampleCollection, validate: sampleCollectionRule,
  groups: collection => [
    { key: 'samples', label: 'Samples', records: collection.samples.map(record => ({
      id: record.id, label: `${record.id} · ${record.zone}${record.archived ? ' · Archived' : ''}`, value: record,
    })) },
    { key: 'freezers', label: 'Freezers', records: collection.freezers.map(source => ({
      id: source.id, label: `${source.id} · Revision ${String(source.revision)}`, value: source,
    })) },
  ],
}
