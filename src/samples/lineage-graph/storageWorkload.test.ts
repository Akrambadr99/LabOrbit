import { describe, expect, it } from 'vitest'
import { authorizeStorageMove, initialSampleLedger } from './sampleLedger'
import { claimStorageReview, storageWorkInbox } from './storageWorkload'

function ready(sampleId: string) {
  return { ...initialSampleLedger, nodes: [...initialSampleLedger.nodes.map(item => item.id === sampleId ? { ...item, qc: 'pass' as const } : item),
    ...(sampleId === 'B-92' ? [{ id: 'B-92', parentId: 'A-03', type: 'assay' as const, qc: 'pass' as const }] : [])],
    transfers: [...initialSampleLedger.transfers, { id: `CE-${sampleId}`, sampleId, from: 'Bench-4', to: 'Assay', at: '2026-09-14T11:00', witness: 'K. Lin' }],
    revision: 3, freezerReservation: { slotId: 'FRZ-02', sampleId },
    reservationOwner: 'custody operator', storageReviews: [{ id: `STORAGE-${sampleId}`, sampleId, slotId: 'FRZ-02',
      sourceRevision: 3, requestedBy: 'custody operator', assignee: 'lab manager', status: 'open' as const }] }
}
describe('named freezer review routing', () => {
  it('projects multiple sample records and enforces named authorization', () => {
    const first = { sampleId: 'B-91', zone: 'cryogenic', ledger: ready('B-91') }
    const second = { sampleId: 'B-92', zone: 'cold', ledger: ready('B-92') }
    expect(storageWorkInbox([second, first]).map(item => item.sampleId)).toEqual(['B-91', 'B-92'])
    const claimed = claimStorageReview(first, 'manager-aya', [first, second], 3)
    expect(() => authorizeStorageMove(claimed, 'B-91', 'lab manager', 'manager-mika')).toThrow(/assigned/)
    expect(authorizeStorageMove(claimed, 'B-91', 'lab manager', 'manager-aya').movedSampleId).toBe('B-91')
  })
  it('blocks unsuitable zones, missing availability and stale revisions', () => {
    const first = { sampleId: 'B-91', zone: 'cryogenic', ledger: ready('B-91') }
    expect(() => claimStorageReview(first, 'manager-mika', [first], 3)).toThrow(/freezer-zone/)
    expect(() => claimStorageReview(first, 'manager-jon', [first], 3)).toThrow(/unavailable/)
    expect(() => claimStorageReview(first, 'manager-aya', [first], 2)).toThrow(/revision changed/)
  })
})
