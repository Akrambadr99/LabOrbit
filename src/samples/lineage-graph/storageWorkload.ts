import type { SampleLedger } from './sampleLedger'

export interface StorageManager { id: string; name: string; zones: readonly string[]; maxOpen: number; available: boolean }
export interface SampleWorkRecord { sampleId: string; zone: string; ledger: SampleLedger }
export interface StorageWorkItem { sampleId: string; reviewId: string; slotId: string; assignee: string; actionable: boolean }
export const storageManagers: readonly StorageManager[] = [
  { id: 'manager-aya', name: 'Aya Rahman', zones: ['cryogenic', 'cold'], maxOpen: 2, available: true },
  { id: 'manager-mika', name: 'Mika Chen', zones: ['cold'], maxOpen: 1, available: true },
  { id: 'manager-jon', name: 'Jon Wells', zones: ['ambient'], maxOpen: 2, available: false },
]
export function storageWorkInbox(records: readonly SampleWorkRecord[], actorId?: string): StorageWorkItem[] {
  return records.flatMap(({ sampleId, ledger }) => (ledger.storageReviews ?? []).filter(item => item.status === 'open')
    .map(item => ({ sampleId, reviewId: item.id, slotId: item.slotId, assignee: item.assignee,
      actionable: item.sourceRevision === ledger.revision && ledger.freezerReservation?.sampleId === sampleId && !ledger.movedSampleId,
    }))).filter(item => actorId === undefined || item.assignee === actorId)
    .sort((a, b) => Number(b.actionable) - Number(a.actionable) || a.slotId.localeCompare(b.slotId) || a.sampleId.localeCompare(b.sampleId))
}
export function managerLoad(records: readonly SampleWorkRecord[], actorId: string): number {
  return storageWorkInbox(records, actorId).filter(item => item.actionable).length
}
export function managerEligibility(records: readonly SampleWorkRecord[], record: SampleWorkRecord, actorId: string): string[] {
  const actor = storageManagers.find(item => item.id === actorId)
  const blockers: string[] = []
  if (!actor?.available) blockers.push('Storage manager is unavailable.')
  if (actor && !actor.zones.includes(record.zone)) blockers.push('Manager lacks freezer-zone qualification.')
  if (actor && managerLoad(records, actorId) >= actor.maxOpen) blockers.push('Storage manager is at capacity.')
  if (record.ledger.reservationOwner === actorId) blockers.push('Reservation owner cannot authorize their own move.')
  return blockers
}
export function claimStorageReview(record: SampleWorkRecord, actorId: string, records: readonly SampleWorkRecord[], expectedRevision: number): SampleLedger {
  const state = record.ledger
  if (state.revision !== expectedRevision) throw new Error('Sample revision changed before claim.')
  const review = (state.storageReviews ?? []).find(item => item.status === 'open' && item.sampleId === record.sampleId && item.sourceRevision === state.revision)
  if (!review) throw new Error('No current storage review is available.')
  if (review.assignee !== 'lab manager') throw new Error('Storage review is already assigned to a manager.')
  const blockers = managerEligibility(records, record, actorId)
  if (blockers.length) throw new Error(blockers[0])
  const revision = state.revision + 1
  return { ...state, revision, storageReviews: state.storageReviews?.map(item => item.id === review.id ?
    { ...item, assignee: actorId, sourceRevision: revision } : item), history: [...state.history,
      { revision, action: 'storage-review-claimed', sampleId: record.sampleId, actor: actorId }] }
}
