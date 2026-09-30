import { describe, expect, it } from 'vitest'
import type { StoragePort } from '../../workspace/repository'
import { saveCurrentCollection } from '../../workspace/recordStorage'
import { openSelectedRecord } from './selectedRecord'
import { readSampleCollection, saveSampleCollection } from './sampleCollection'
import { readSampleLedger, saveSampleLedger, passQuality } from './sampleLedger'

class MemoryStorage implements StoragePort {
  data = new Map<string, string>()
  fail = false
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, raw: string) { if (this.fail) throw new Error('Storage full'); this.data.set(key, raw) }
}
const edit: (state: ReturnType<typeof readSampleLedger>) => ReturnType<typeof readSampleLedger> = state => passQuality(state, 'B-91')
const key = 'laborbit:sample:SMP-2048:lineage:v1'
describe('selected sample persistence', () => {
  it('preserves the primary migration source when a secondary record opens first', () => {
    const storage = new MemoryStorage()
    const before = readSampleCollection(storage)
    const peer = before.samples[1]
    if (!peer) throw new Error('Secondary fixture missing')
    const bound = openSelectedRecord(storage, peer.id)
    expect(readSampleCollection(bound)).toEqual(before)
    expect(storage.data.size).toBe(0)
  })
  it('imports legacy history once and retains its original backup', () => {
    const storage = new MemoryStorage()
    const legacy = edit(readSampleLedger(storage))
    saveSampleLedger(storage, legacy)
    const backup = storage.getItem(key)
    const bound = openSelectedRecord(storage)
    expect(readSampleLedger(bound)).toEqual(legacy)
    saveSampleLedger(bound, legacy)
    expect(readSampleCollection(storage).samples[0]?.ledger).toEqual(legacy)
    expect(storage.getItem(key)).toBe(backup)
    saveSampleLedger(storage, readSampleLedger(new MemoryStorage()))
    expect(readSampleLedger(openSelectedRecord(storage))).toEqual(legacy)
  })
  it('persists a domain action and preserves every unrelated record', () => {
    const storage = new MemoryStorage(), before = readSampleCollection(storage)
    const bound = openSelectedRecord(storage), changed = edit(readSampleLedger(bound))
    saveSampleLedger(bound, changed)
    const after = readSampleCollection(storage)
    expect(after.samples[0]?.ledger).toEqual(changed)
    expect(after.samples.slice(1)).toEqual(before.samples.slice(1))
    expect(readSampleLedger(openSelectedRecord(storage))).toEqual(changed)
    expect(after.audit.at(-1)).toMatchObject({ action: 'detail-updated', id: 'B-91' })
  })
  it('rejects stale edits without replacing the newer domain state', () => {
    const storage = new MemoryStorage()
    const first = openSelectedRecord(storage), stale = openSelectedRecord(storage)
    const changed = edit(readSampleLedger(first))
    saveSampleLedger(first, changed)
    expect(() => saveSampleLedger(stale, edit(readSampleLedger(stale)))).toThrow('changed in another view')
    expect(readSampleLedger(openSelectedRecord(storage))).toEqual(changed)
  })
  it('merges with an unrelated record archive without losing that edit', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const before = readSampleCollection(storage), peer = before.samples[1]
    if (!peer) throw new Error('Peer fixture missing')
    const newer = { ...before, samples: before.samples.map(item => item.id === peer.id ? { ...item, archived: true } : item) }
    saveSampleCollection(storage, newer)
    saveSampleLedger(bound, edit(readSampleLedger(bound)))
    expect(readSampleCollection(storage).samples[1]).toEqual(newer.samples[1])
  })
  it('rejects missing and archived targets without writing', () => {
    const storage = new MemoryStorage()
    expect(() => openSelectedRecord(storage, 'missing')).toThrow('not found')
    expect(storage.data.size).toBe(0)
    const before = readSampleCollection(storage)
    saveSampleCollection(storage, { ...before, samples: before.samples.map(item => ({ ...item, archived: true })) })
    const snapshot = [...storage.data]
    expect(() => openSelectedRecord(storage)).toThrow('archived')
    expect([...storage.data]).toEqual(snapshot)
  })
  it('rejects a record archived after the editor opened', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const before = readSampleCollection(storage)
    saveSampleCollection(storage, { ...before, samples: before.samples.map(item => ({ ...item, archived: true })) })
    expect(() => saveSampleLedger(bound, edit(readSampleLedger(bound)))).toThrow('changed in another view')
  })
  it('preserves retryability after a recoverable storage failure', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const changed = edit(readSampleLedger(bound))
    storage.fail = true
    expect(() => saveSampleLedger(bound, changed)).toThrow('Storage full')
    storage.fail = false
    saveSampleLedger(bound, changed)
    expect(readSampleLedger(openSelectedRecord(storage))).toEqual(changed)
  })
  it('protects a detail edit against a stale whole-workspace save', () => {
    const storage = new MemoryStorage(), stale = readSampleCollection(storage)
    const bound = openSelectedRecord(storage)
    saveSampleLedger(bound, edit(readSampleLedger(bound)))
    expect(() => saveCurrentCollection(storage, stale, stale, readSampleCollection, saveSampleCollection)).toThrow('Workspace changed')
    expect(readSampleCollection(storage).samples[0]?.ledger).not.toEqual(stale.samples[0]?.ledger)
  })
})
