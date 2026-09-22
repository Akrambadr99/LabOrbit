import type { StoragePort } from '../../workspace/repository'
import { custodyEvents, custodyFinding, releaseFindings, sampleNodes } from './custody'
import type { CustodyEvent, SampleNode } from './custody'

export interface SampleLedger {
  nodes: readonly SampleNode[]
  transfers: readonly CustodyEvent[]
  movedSampleId: string | null
  revision: number
  history: readonly { revision: number; action: string; sampleId: string }[]
}
const key = 'laborbit:sample:SMP-2048:lineage:v1'
export const initialSampleLedger: SampleLedger = { nodes: sampleNodes, transfers: custodyEvents, movedSampleId: null, revision: 0, history: [] }
export function readSampleLedger(storage: StoragePort): SampleLedger {
  const raw = storage.getItem(key)
  if (!raw) return initialSampleLedger
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('nodes' in value) || !Array.isArray(value.nodes) ||
    !('transfers' in value) || !Array.isArray(value.transfers) ||
    !('movedSampleId' in value) || (value.movedSampleId !== null && typeof value.movedSampleId !== 'string') ||
    !('revision' in value) || typeof value.revision !== 'number' ||
    !('history' in value) || !Array.isArray(value.history)) throw new Error('Invalid sample-lineage record.')
  return value as SampleLedger
}
function withEvent(state: SampleLedger, action: string, sampleId: string): SampleLedger {
  const revision = state.revision + 1
  return { ...state, revision, history: [...state.history, { revision, action, sampleId }] }
}
export function recordCustody(state: SampleLedger, transfer: CustodyEvent): SampleLedger {
  const finding = custodyFinding(transfer, state.transfers)
  if (finding) throw new Error(finding)
  return withEvent({ ...state, transfers: [...state.transfers, transfer] }, 'custody-transferred', transfer.sampleId)
}
export function passQuality(state: SampleLedger, id: string): SampleLedger {
  if (!state.nodes.some(node => node.id === id)) throw new Error('Sample node was not found.')
  return withEvent({ ...state, nodes: state.nodes.map(node => node.id === id ? { ...node, qc: 'pass' } : node) }, 'qc-passed', id)
}
export function storageMoveBlockers(state: SampleLedger, id: string): string[] {
  return releaseFindings(id, state.nodes, state.transfers)
}
export function authorizeStorageMove(state: SampleLedger, id: string): SampleLedger {
  const blockers = storageMoveBlockers(state, id)
  if (blockers.length) throw new Error(blockers.join(' '))
  if (state.movedSampleId) throw new Error('A storage move is already authorized.')
  return withEvent({ ...state, movedSampleId: id }, 'storage-move-authorized', id)
}
export function reopenQuality(state: SampleLedger, id: string): SampleLedger {
  if (state.movedSampleId === id) throw new Error('Authorized storage move depends on passed quality control.')
  return withEvent({ ...state, nodes: state.nodes.map(node => node.id === id ? { ...node, qc: 'pending' } : node) }, 'qc-reopened', id)
}
export function saveSampleLedger(storage: StoragePort, state: SampleLedger): SampleLedger {
  storage.setItem(key, JSON.stringify(state))
  return state
}
