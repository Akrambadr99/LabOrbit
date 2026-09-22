import { describe, expect, it } from 'vitest'
import { archiveSample, claimSampleReviews, claimSampleStorage, readSampleCollection,
  sampleById, sampleInbox, saveSampleCollection, seedSampleCollection, setFreezerAvailability } from './sampleCollection'

function storage() { const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } } }
describe('persisted sample storage collection', () => {
  it('holds independent lineage and a real storage work queue', () => {
    const state = seedSampleCollection()
    expect(state.samples).toHaveLength(5)
    expect(sampleInbox(state).map(item => item.sampleId)).toEqual(['B-92', 'B-93'])
  })
  it('claims only the selected qualified storage review and persists it', () => {
    const port = storage(); const state = seedSampleCollection()
    const next = claimSampleStorage(state, 'B-92', 'manager-aya', sampleById(state, 'B-92').ledger.revision)
    saveSampleCollection(port, next)
    expect(sampleInbox(readSampleCollection(port)).find(item => item.sampleId === 'B-92')?.assignee).toBe('manager-aya')
    expect(sampleInbox(readSampleCollection(port)).find(item => item.sampleId === 'B-93')?.assignee).toBe('lab manager')
    expect(() => claimSampleStorage(state, 'B-92', 'manager-mika', sampleById(state, 'B-92').ledger.revision)).toThrow('freezer-zone qualification')
  })
  it('propagates freezer outage only to linked sample reservations', () => {
    const state = seedSampleCollection(); const result = setFreezerAvailability(state, 'FRZ-02', false, 1)
    expect(result.updated).toEqual(['B-92'])
    expect(sampleById(result.collection, 'B-92').ledger.storageReviews?.at(-1)?.status).toBe('cancelled')
    expect(sampleById(result.collection, 'B-93').ledger.revision).toBe(sampleById(state, 'B-93').ledger.revision)
    expect(() => setFreezerAvailability(result.collection, 'FRZ-02', true, 1)).toThrow('revision changed')
  })
  it('reports selected partial claim results and protects open storage work', () => {
    const state = seedSampleCollection(); const result = claimSampleReviews(state, ['B-92', 'B-93', 'B-94', 'missing'], 'manager-aya')
    expect(result.updated).toEqual(['B-92', 'B-93'])
    expect(result.blocked.map(item => item.id)).toEqual(['B-94', 'missing'])
    expect(() => archiveSample(state, 'B-92')).toThrow('open storage review')
  })
})
