import type { StoragePort } from '../../workspace/repository'
import { initialSampleLedger, passQuality, readSampleLedger, recordCustody, releaseFreezerSlot,
  requestStorageReview, reserveFreezerSlot } from './sampleLedger'
import type { SampleLedger } from './sampleLedger'
import { claimStorageReview, storageWorkInbox } from './storageWorkload'
import type { SampleWorkRecord } from './storageWorkload'

export interface SampleRecord { id: string; zone: string; freezerId: string; ledger: SampleLedger; archived: boolean }
export interface FreezerRecord { id: string; revision: number; available: boolean; sampleIds: readonly string[] }
export interface SampleCollection { samples: readonly SampleRecord[]; freezers: readonly FreezerRecord[]; audit: readonly { action: string; id: string; related: readonly string[] }[] }
export interface SampleBatch { collection: SampleCollection; updated: string[]; skipped: string[]; blocked: { id: string; reason: string }[] }
const key = 'laborbit:sample-collection:v1'
function prepared(id: string, slot: string, review: boolean): SampleLedger {
  let ledger: SampleLedger = { ...initialSampleLedger, nodes: initialSampleLedger.nodes.map(node =>
    node.id === 'B-91' ? { ...node, id } : node) }
  ledger = passQuality(ledger, id)
  ledger = recordCustody(ledger, { id: `CE-${id}`, sampleId: id, from: 'Bench-4', to: 'Freezer-2',
    at: '2026-09-14T12:00', witness: 'D. Rao' })
  ledger = reserveFreezerSlot(ledger, id, slot)
  return review ? requestStorageReview(ledger, id, 'custody operator') : ledger
}
export function seedSampleCollection(legacy: SampleLedger = initialSampleLedger): SampleCollection {
  return { samples: [
    { id: 'B-91', zone: 'cryogenic', freezerId: 'FRZ-02', ledger: legacy, archived: false },
    { id: 'B-92', zone: 'cryogenic', freezerId: 'FRZ-02', ledger: prepared('B-92', 'FRZ-02', true), archived: false },
    { id: 'B-93', zone: 'cold', freezerId: 'FRZ-09', ledger: prepared('B-93', 'FRZ-09', true), archived: false },
    { id: 'B-94', zone: 'cold', freezerId: 'FRZ-09', ledger: prepared('B-94', 'FRZ-09', false), archived: false },
    { id: 'B-95', zone: 'ambient', freezerId: 'FRZ-11', ledger: prepared('B-95', 'FRZ-11', false), archived: true },
  ], freezers: [
    { id: 'FRZ-02', revision: 1, available: true, sampleIds: ['B-91', 'B-92'] },
    { id: 'FRZ-09', revision: 1, available: true, sampleIds: ['B-93', 'B-94'] },
    { id: 'FRZ-11', revision: 1, available: true, sampleIds: ['B-95'] },
  ], audit: [] }
}
export function readSampleCollection(storage: StoragePort): SampleCollection {
  const raw = storage.getItem(key)
  if (!raw) return seedSampleCollection(readSampleLedger(storage))
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('samples' in value) || !Array.isArray(value.samples) ||
    !('freezers' in value) || !Array.isArray(value.freezers) || !('audit' in value) || !Array.isArray(value.audit))
    throw new Error('Invalid sample collection.')
  return value as SampleCollection
}
export function saveSampleCollection(storage: StoragePort, value: SampleCollection): SampleCollection { storage.setItem(key, JSON.stringify(value)); return value }
export function sampleById(value: SampleCollection, id: string): SampleRecord {
  const record = value.samples.find(item => item.id === id)
  if (!record) throw new Error(`Sample ${id} was not found.`)
  return record
}
export function sampleRows(value: SampleCollection, query = '', filter = 'active'): SampleRecord[] {
  const needle = query.trim().toLowerCase()
  return value.samples.filter(item => (filter === 'all' || (filter === 'archived') === item.archived) &&
    (!needle || `${item.id} ${item.zone} ${item.freezerId}`.toLowerCase().includes(needle))).toSorted((a, b) => a.id.localeCompare(b.id))
}
export function sampleInbox(value: SampleCollection) {
  return storageWorkInbox(value.samples.filter(item => !item.archived).map(item => ({ sampleId: item.id, zone: item.zone, ledger: item.ledger })))
}
export function claimSampleStorage(value: SampleCollection, id: string, actorId: string, expectedRevision: number): SampleCollection {
  const record = sampleById(value, id)
  if (record.archived) throw new Error('Archived sample cannot receive storage claim.')
  const records: SampleWorkRecord[] = value.samples.filter(item => !item.archived).map(item => ({ sampleId: item.id, zone: item.zone, ledger: item.ledger }))
  const ledger = claimStorageReview({ sampleId: id, zone: record.zone, ledger: record.ledger }, actorId, records, expectedRevision)
  return { ...value, samples: value.samples.map(item => item.id === id ? { ...item, ledger } : item),
    audit: [...value.audit, { action: 'storage-claimed', id, related: [actorId] }] }
}
export function setFreezerAvailability(value: SampleCollection, id: string, available: boolean, expectedRevision: number): SampleBatch {
  const freezer = value.freezers.find(item => item.id === id)
  if (freezer?.revision !== expectedRevision) throw new Error('Freezer source revision changed.')
  const updated: string[] = []; const skipped: string[] = []; const blocked: SampleBatch['blocked'] = []
  const samples = value.samples.map(item => {
    if (!freezer.sampleIds.includes(item.id) || item.archived) { skipped.push(item.id); return item }
    if (available || !item.ledger.freezerReservation) { skipped.push(item.id); return item }
    try { const ledger = releaseFreezerSlot(item.ledger); updated.push(item.id); return { ...item, ledger } }
    catch (error) { blocked.push({ id: item.id, reason: error instanceof Error ? error.message : 'Freezer release blocked.' }); return item }
  })
  return { collection: { ...value, samples, freezers: value.freezers.map(item => item.id === id ?
    { ...item, revision: item.revision + 1, available } : item),
    audit: [...value.audit, { action: available ? 'freezer-restored' : 'freezer-outage', id, related: updated }] }, updated, skipped, blocked }
}
export function claimSampleReviews(value: SampleCollection, ids: readonly string[], actorId: string): SampleBatch {
  let collection = value; const updated: string[] = []; const skipped: string[] = []; const blocked: SampleBatch['blocked'] = []
  for (const id of ids) {
    if (updated.includes(id) || skipped.includes(id)) { skipped.push(id); continue }
    try { collection = claimSampleStorage(collection, id, actorId, sampleById(collection, id).ledger.revision); updated.push(id) }
    catch (error) { blocked.push({ id, reason: error instanceof Error ? error.message : 'Storage claim blocked.' }) }
  }
  return { collection, updated, skipped, blocked }
}
export function archiveSample(value: SampleCollection, id: string): SampleCollection {
  const record = sampleById(value, id)
  if (record.archived || record.ledger.storageReviews?.some(item => item.status === 'open') || record.ledger.movedSampleId)
    throw new Error('Resolve open storage review or authorized move before archiving sample.')
  return { ...value, samples: value.samples.map(item => item.id === id ? { ...item, archived: true } : item),
    audit: [...value.audit, { action: 'sample-archived', id, related: [record.freezerId] }] }
}
