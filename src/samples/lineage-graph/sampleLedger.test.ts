import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../../data/memory-storage'
import { authorizeStorageMove, passQuality, readSampleLedger, recordCustody, releaseFreezerSlot, reopenQuality, reserveFreezerSlot, saveSampleLedger, storageMoveBlockers } from './sampleLedger'
describe('lineage evidence to storage move', () => {
  it('persists custody and QC evidence to unblock a dependent move', () => {
    const storage = new MemoryStorage()
    expect(storageMoveBlockers(readSampleLedger(storage), 'B-91')).toHaveLength(3)
    const transferred = recordCustody(readSampleLedger(storage), { id: 'CE-3', sampleId: 'B-91', from: 'Bench-4', to: 'Assay', at: '2026-09-14T11:00', witness: 'K. Lin' })
    saveSampleLedger(storage, reserveFreezerSlot(passQuality(transferred, 'B-91'), 'B-91'))
    expect(storageMoveBlockers(readSampleLedger(storage), 'B-91')).toEqual([])
  })
  it('protects evidence after a storage move depends on it', () => {
    const transferred = recordCustody(readSampleLedger(new MemoryStorage()), { id: 'CE-3', sampleId: 'B-91', from: 'Bench-4', to: 'Assay', at: '2026-09-14T11:00', witness: 'K. Lin' })
    const moved = authorizeStorageMove(reserveFreezerSlot(passQuality(transferred, 'B-91'), 'B-91'), 'B-91')
    expect(() => reopenQuality(moved, 'B-91')).toThrow(/depends/)
    expect(moved.history.map(item => item.action)).toEqual(['custody-transferred', 'qc-passed', 'freezer-slot-reserved', 'storage-move-authorized'])
    expect(() => releaseFreezerSlot(moved)).toThrow(/depends/)
  })
  it('reports competing slot reservations and recovers through cancellation before a move', () => {
    const other = reserveFreezerSlot(readSampleLedger(new MemoryStorage()), 'SMP-OTHER')
    expect(storageMoveBlockers(other, 'B-91').join(' ')).toMatch(/reserved for SMP-OTHER/)
    expect(() => reserveFreezerSlot(other, 'B-91')).toThrow(/conflicts/)
    expect(reserveFreezerSlot(releaseFreezerSlot(other), 'B-91').freezerReservation?.sampleId).toBe('B-91')
  })
})
