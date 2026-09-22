import type { StoragePort } from '../../workspace/repository'
import { custodyEvents, custodyFinding, releaseFindings, sampleNodes } from './custody'
import type { CustodyEvent, SampleNode } from './custody'

export interface SampleLedger {
  nodes: readonly SampleNode[]
  transfers: readonly CustodyEvent[]
  movedSampleId: string | null
  freezerReservation: { slotId: string; sampleId: string } | null
  reservationOwner: string | null
  storageReviews?: readonly StorageReview[] | undefined
  revision: number
  history: readonly { revision: number; action: string; sampleId: string; actor?: string }[]
}
export interface StorageReview {
  id: string
  sampleId: string
  slotId: string
  sourceRevision: number
  requestedBy: string
  assignee: string
  status: 'open' | 'stale' | 'completed' | 'cancelled' | 'superseded'
  supersedesId?: string
}
const key = 'laborbit:sample:SMP-2048:lineage:v1'
export const initialSampleLedger: SampleLedger = { nodes: sampleNodes, transfers: custodyEvents, movedSampleId: null, freezerReservation: null, reservationOwner: null, storageReviews: [], revision: 0, history: [] }
export function readSampleLedger(storage: StoragePort): SampleLedger {
  const raw = storage.getItem(key)
  if (!raw) return initialSampleLedger
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('nodes' in value) || !Array.isArray(value.nodes) ||
    !('transfers' in value) || !Array.isArray(value.transfers) ||
    !('movedSampleId' in value) || (value.movedSampleId !== null && typeof value.movedSampleId !== 'string') ||
    !('revision' in value) || typeof value.revision !== 'number' ||
    !('history' in value) || !Array.isArray(value.history)) throw new Error('Invalid sample-lineage record.')
  const record = value as Omit<SampleLedger, 'reservationOwner'> & Partial<Pick<SampleLedger, 'reservationOwner'>>
  return { ...record, freezerReservation: record.freezerReservation ?? null, reservationOwner: record.reservationOwner ?? (record.freezerReservation ? 'custody operator' : null),
    storageReviews: record.storageReviews ?? [] }
}
export function storageReviewInbox(state: SampleLedger, actor: string): StorageReview[] {
  return (state.storageReviews ?? []).filter(item => item.assignee === actor && item.status === 'open')
}
export function requestStorageReview(state: SampleLedger, id: string, actor: string, assignee = 'lab manager'): SampleLedger {
  if (actor !== state.reservationOwner || assignee !== 'lab manager' || actor === assignee) throw new Error('Reservation owner must hand off to independent lab management.')
  if (storageMoveBlockers(state, id).length || state.movedSampleId || !state.freezerReservation) throw new Error('Resolve custody, quality and freezer blockers before review.')
  if (state.storageReviews?.some(item => item.status === 'open')) throw new Error('A storage review is already open.')
  const previous = [...(state.storageReviews ?? [])].reverse().find(item => item.status === 'stale')
  const revision = state.revision + 1
  const request: StorageReview = { id: `STORAGE-${id}-${String(revision)}`, sampleId: id, slotId: state.freezerReservation.slotId,
    sourceRevision: revision, requestedBy: actor, assignee, status: 'open', ...(previous ? { supersedesId: previous.id } : {}) }
  return { ...state, revision, storageReviews: [...(state.storageReviews ?? []).map(item => item.id === previous?.id ?
    { ...item, status: 'superseded' as const } : item), request],
    history: [...state.history, { revision, action: 'storage-review-requested', sampleId: id, actor }] }
}
function withEvent(state: SampleLedger, action: string, sampleId: string, actor?: string): SampleLedger {
  const revision = state.revision + 1
  return { ...state, revision, history: [...state.history, { revision, action, sampleId, ...(actor ? { actor } : {}) }] }
}
export function recordCustody(state: SampleLedger, transfer: CustodyEvent): SampleLedger {
  const finding = custodyFinding(transfer, state.transfers)
  if (finding) throw new Error(finding)
  return withEvent({ ...state, transfers: [...state.transfers, transfer],
    storageReviews: state.storageReviews?.map(item => item.status === 'open' && item.sampleId === transfer.sampleId ?
      { ...item, status: 'stale' as const } : item) }, 'custody-transferred', transfer.sampleId)
}
export function passQuality(state: SampleLedger, id: string): SampleLedger {
  if (!state.nodes.some(node => node.id === id)) throw new Error('Sample node was not found.')
  return withEvent({ ...state, nodes: state.nodes.map(node => node.id === id ? { ...node, qc: 'pass' } : node),
    storageReviews: state.storageReviews?.map(item => item.status === 'open' && item.sampleId === id ?
      { ...item, status: 'stale' as const } : item) }, 'qc-passed', id)
}
export function storageMoveBlockers(state: SampleLedger, id: string): string[] {
  const blockers = releaseFindings(id, state.nodes, state.transfers)
  if (id === 'B-91' && state.freezerReservation?.sampleId !== id) blockers.push(state.freezerReservation ?
    `Freezer slot ${state.freezerReservation.slotId} is reserved for ${state.freezerReservation.sampleId}.` :
    'A freezer slot reservation is required for B-91.')
  return blockers
}
export function reserveFreezerSlot(state: SampleLedger, sampleId: string, slotId = 'FRZ-02', actor = 'custody operator'): SampleLedger {
  if (actor !== 'custody operator') throw new Error('Only the custody operator may reserve freezer capacity.')
  if (state.freezerReservation?.sampleId === sampleId && state.freezerReservation.slotId === slotId) return state
  if (state.freezerReservation) throw new Error(`Freezer slot ${slotId} conflicts with ${state.freezerReservation.sampleId}.`)
  return withEvent({ ...state, freezerReservation: { slotId, sampleId }, reservationOwner: actor }, 'freezer-slot-reserved', sampleId, actor)
}
export function releaseFreezerSlot(state: SampleLedger): SampleLedger {
  if (!state.freezerReservation) throw new Error('No freezer reservation exists.')
  if (state.movedSampleId === state.freezerReservation.sampleId) throw new Error('Authorized storage move depends on this freezer reservation.')
  return withEvent({ ...state, freezerReservation: null, reservationOwner: null,
    storageReviews: state.storageReviews?.map(item => item.status === 'open' ?
      { ...item, status: 'cancelled' as const } : item) }, 'freezer-slot-released', state.freezerReservation.sampleId)
}
export function storageMovePolicy(state: SampleLedger, id: string, actor: string, managerId?: string): { allowed: boolean; blockers: string[]; queue: 'custody' | 'independent-release' | 'complete' } {
  const blockers = storageMoveBlockers(state, id)
  if (actor !== 'lab manager') blockers.push('Lab manager authorization is required for the freezer move.')
  if (actor === state.reservationOwner) blockers.push('Reservation owner cannot independently authorize the move.')
  if (state.movedSampleId) blockers.push('A storage move is already authorized.')
  if (state.storageReviews?.length && !(state.storageReviews ?? []).some(item =>
    item.status === 'open' && item.assignee === (managerId ?? actor) &&
    item.sampleId === id && item.sourceRevision === state.revision && item.slotId === state.freezerReservation?.slotId))
    blockers.push('A current storage review must be assigned to this manager.')
  return { allowed: blockers.length === 0, blockers, queue: state.movedSampleId ? 'complete' : storageMoveBlockers(state, id).length ? 'custody' : 'independent-release' }
}
export function authorizeStorageMove(state: SampleLedger, id: string, actor: string, managerId?: string): SampleLedger {
  const blockers = storageMovePolicy(state, id, actor, managerId).blockers
  if (blockers.length) throw new Error(blockers.join(' '))
  return withEvent({ ...state, movedSampleId: id, storageReviews: state.storageReviews?.map(item =>
    item.status === 'open' ? { ...item, status: 'completed' as const } : item) }, 'storage-move-authorized', id, actor)
}
export function reopenQuality(state: SampleLedger, id: string): SampleLedger {
  if (state.movedSampleId === id) throw new Error('Authorized storage move depends on passed quality control.')
  return withEvent({ ...state, nodes: state.nodes.map(node => node.id === id ? { ...node, qc: 'pending' } : node),
    storageReviews: state.storageReviews?.map(item => item.status === 'open' && item.sampleId === id ?
      { ...item, status: 'stale' as const } : item) }, 'qc-reopened', id)
}
export function saveSampleLedger(storage: StoragePort, state: SampleLedger): SampleLedger {
  storage.setItem(key, JSON.stringify(state))
  return state
}
