import { describe, expect, it, vi } from 'vitest'
import { MemoryStorage } from '../../data/memory-storage'
import { StoredDataError } from '../../workspace/storageValidation'
import { sampleCollectionRule } from './collectionValidation'
import { readSampleCollection, sampleById, saveSampleCollection, seedSampleCollection,
  setFreezerAvailability } from './sampleCollection'
import type { SampleCollection } from './sampleCollection'
import { initialSampleLedger, reopenQuality } from './sampleLedger'

const key = 'laborbit:sample-collection:v1'
const legacyKey = 'laborbit:sample:SMP-2048:lineage:v1'
const seed = seedSampleCollection()
const record = sampleById(seed, 'B-92')
function withLedger(ledger: unknown) { return { ...seed, samples: [{ ...record, ledger }] } }

describe('sample collection storage integrity', () => {
  it('seeds only absent data without writing', () => {
    const storage = new MemoryStorage()
    const write = vi.spyOn(storage, 'setItem')
    expect(readSampleCollection(storage)).toEqual(seed)
    expect(write).not.toHaveBeenCalled()
  })

  it.each(['', '{broken', 'null', '[]', '{}'])('preserves unreadable saved text %j', raw => {
    const storage = new MemoryStorage()
    storage.setItem(key, raw)
    const write = vi.spyOn(storage, 'setItem')
    expect(() => readSampleCollection(storage)).toThrow(StoredDataError)
    expect(storage.getItem(key)).toBe(raw)
    expect(write).not.toHaveBeenCalled()
  })

  it.each([
    ['null ledger', withLedger(null)],
    ['node shape', withLedger({ ...record.ledger, nodes: [null] })],
    ['quality state', withLedger({ ...record.ledger, nodes: [{ id: 'B-92', type: 'assay', qc: 'approved' }] })],
    ['node type', withLedger({ ...record.ledger, nodes: [{ id: 'B-92', type: 'biopsy', qc: 'pass' }] })],
    ['custody shape', withLedger({ ...record.ledger, transfers: [null] })],
    ['custody witness', withLedger({ ...record.ledger, transfers: [{ id: 'CE-X', sampleId: 'B-92', from: 'a', to: 'b', at: '2026-09-14', witness: 9 }] })],
    ['reservation shape', withLedger({ ...record.ledger, freezerReservation: { slotId: 'FRZ-02', sampleId: 92 } })],
    ['review state', withLedger({ ...record.ledger, storageReviews: [{ ...record.ledger.storageReviews?.[0], status: 'approved' }] })],
    ['review source revision', withLedger({ ...record.ledger, storageReviews: [{ ...record.ledger.storageReviews?.[0], sourceRevision: -1 }] })],
    ['history actor', withLedger({ ...record.ledger, history: [{ revision: 1, action: 'old', sampleId: 'B-92', actor: 22 }] })],
    ['freezer availability', { ...seed, freezers: [{ id: 'FRZ-02', revision: 1, available: 'false', sampleIds: ['B-92'] }] }],
    ['audit references', { ...seed, audit: [{ action: 'old', id: 'B-92', related: [1] }] }],
  ])('rejects malformed %s before it reaches a screen', (_name, candidate) => {
    const storage = new MemoryStorage()
    const raw = JSON.stringify(candidate)
    storage.setItem(key, raw)
    const write = vi.spyOn(storage, 'setItem')
    expect(() => readSampleCollection(storage)).toThrow(StoredDataError)
    expect(storage.getItem(key)).toBe(raw)
    expect(write).not.toHaveBeenCalled()
  })

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN])('rejects invalid revision %s without overwriting', revision => {
    const storage = new MemoryStorage()
    saveSampleCollection(storage, seed)
    const before = storage.getItem(key)
    const write = vi.spyOn(storage, 'setItem')
    expect(() => saveSampleCollection(storage, withLedger({ ...record.ledger, revision }) as SampleCollection)).toThrow(StoredDataError)
    expect(storage.getItem(key)).toBe(before)
    expect(write).not.toHaveBeenCalled()
  })

  it.each([
    ['sample', { ...seed, samples: [record, record] }],
    ['freezer', { ...seed, freezers: [...seed.freezers, ...seed.freezers] }],
    ['node', withLedger({ ...record.ledger, nodes: [...record.ledger.nodes, ...record.ledger.nodes] })],
    ['custody event', withLedger({ ...record.ledger, transfers: [...record.ledger.transfers, ...record.ledger.transfers] })],
    ['review', withLedger({ ...record.ledger, storageReviews: [...(record.ledger.storageReviews ?? []), ...(record.ledger.storageReviews ?? [])] })],
  ])('rejects ambiguous duplicate %s identity', (_name, candidate) => {
    expect(() => sampleCollectionRule(candidate)).toThrow(/duplicate identifiers/)
  })

  it('round-trips absent optional reviews and retained unknown metadata', () => {
    const value = { ...seed, futureMetadata: { version: 2 }, samples: [...seed.samples,
      { ...record, id: 'B-EXTRA', ledger: { ...record.ledger, storageReviews: undefined,
        futureEvidence: { retained: true }, history: [{ revision: 1, action: 'historic', sampleId: 'B-EXTRA' }] } }] }
    expect(sampleCollectionRule(value)).toBe(value)
    const storage = new MemoryStorage()
    saveSampleCollection(storage, value)
    expect(readSampleCollection(storage)).toEqual(JSON.parse(JSON.stringify(value)))
  })

  it('preserves pending QC, stale review history, and unavailable freezer transitions', () => {
    const unavailable = setFreezerAvailability(seed, 'FRZ-02', false, 1).collection
    const stale = reopenQuality(record.ledger, record.id)
    const value = { ...unavailable, samples: unavailable.samples.map(item => item.id === record.id ? { ...item, ledger: stale } : item) }
    const storage = new MemoryStorage()
    saveSampleCollection(storage, value)
    expect(readSampleCollection(storage)).toEqual(value)
    expect(stale.storageReviews?.[0]?.status).toBe('stale')
  })

  it('preserves blocked evidence and conflicting reservations for domain recovery', () => {
    const value = withLedger({ ...record.ledger, nodes: [{ id: 'B-92', parentId: 'missing-parent', type: 'assay', qc: 'hold' }],
      freezerReservation: { slotId: 'FRZ-02', sampleId: 'SMP-OTHER' } }) as SampleCollection
    const storage = new MemoryStorage()
    saveSampleCollection(storage, value)
    expect(readSampleCollection(storage)).toEqual(value)
  })

  it('validates migrated legacy output without rewriting the legacy record', () => {
    const storage = new MemoryStorage()
    const legacy = { ...initialSampleLedger, freezerReservation: undefined,
      reservationOwner: undefined, storageReviews: undefined }
    const raw = JSON.stringify(legacy)
    storage.setItem(legacyKey, raw)
    const write = vi.spyOn(storage, 'setItem')
    expect(sampleById(readSampleCollection(storage), 'B-91').ledger).toEqual(initialSampleLedger)
    expect(storage.getItem(legacyKey)).toBe(raw)
    expect(write).not.toHaveBeenCalled()
  })

  it.each(['', JSON.stringify({ ...initialSampleLedger, nodes: [null] })])(
    'identifies the damaged legacy key without resetting it', raw => {
      const storage = new MemoryStorage()
      storage.setItem(legacyKey, raw)
      const write = vi.spyOn(storage, 'setItem')
      expect(() => readSampleCollection(storage)).toThrow(expect.objectContaining({ key: legacyKey, operation: 'read' }))
      expect(storage.getItem(legacyKey)).toBe(raw)
      expect(storage.getItem(key)).toBeNull()
      expect(write).not.toHaveBeenCalled()
    })

  it('reports a safe field path without saved private values', () => {
    const storage = new MemoryStorage()
    storage.setItem(key, JSON.stringify(withLedger({ ...record.ledger, reservationOwner: { secret: 'private-value' } })))
    expect(() => readSampleCollection(storage)).toThrow(/\$\.samples\[0\]\.ledger\.reservationOwner/)
    expect(() => readSampleCollection(storage)).not.toThrow(/private-value/)
  })
})
