import type { ExplorerPolicy } from '../../workspace/collectionExplorer'
import type { SampleCollection, SampleRecord } from './sampleCollection'
import { releaseFindings } from './custody'

export function sampleTriage(collection: SampleCollection): ExplorerPolicy<SampleRecord> {
  return {
    searchText: record => [record.id, record.zone, record.freezerId].join(' '),
    revision: record => record.ledger.revision,
    states: [
      { value: 'freezer-unavailable', label: 'Freezer unavailable' },
      { value: 'review-stale', label: 'Review needs renewal' },
      { value: 'evidence-blocked', label: 'Quality or custody evidence needed' },
      { value: 'authorized', label: 'Move authorized' },
      { value: 'review-open', label: 'Awaiting storage review' },
      { value: 'reserved', label: 'Reserved without open review' },
      { value: 'unreserved', label: 'Reservation needed' },
    ],
    state: record => {
      const ledger = record.ledger
      if (!collection.freezers.find(freezer => freezer.id === record.freezerId)?.available) return 'freezer-unavailable'
      if (ledger.storageReviews?.some(review => review.status === 'stale' || (review.status === 'open' &&
        (review.sourceRevision !== ledger.revision || review.sampleId !== record.id || review.slotId !== ledger.freezerReservation?.slotId)))) return 'review-stale'
      try {
        if (releaseFindings(record.id, ledger.nodes, ledger.transfers).length) return 'evidence-blocked'
      } catch {
        return 'evidence-blocked'
      }
      if (ledger.movedSampleId === record.id) return 'authorized'
      if (ledger.storageReviews?.some(review => review.status === 'open')) return 'review-open'
      return ledger.freezerReservation?.sampleId === record.id ? 'reserved' : 'unreserved'
    },
  }
}
