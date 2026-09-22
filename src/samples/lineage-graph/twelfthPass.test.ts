import { describe, expect, it } from 'vitest'
import { authorizeStorageMove, initialSampleLedger, passQuality, recordCustody, releaseFreezerSlot, requestStorageReview, reserveFreezerSlot, storageReviewInbox } from './sampleLedger'

describe('freezer review ownership', () => {
  it('retains cancelled handoff after reservation release', () => {
    const transferred = recordCustody(initialSampleLedger, { id: 'CE-3', sampleId: 'B-91', from: 'Bench-4', to: 'Assay', at: '2026-09-14T11:00', witness: 'K. Lin' })
    const ready = reserveFreezerSlot(passQuality(transferred, 'B-91'), 'B-91')
    const requested = requestStorageReview(ready, 'B-91', 'custody operator')
    expect(storageReviewInbox(requested, 'lab manager')).toHaveLength(1)
    const cancelled = releaseFreezerSlot(requested)
    expect(cancelled.storageReviews?.[0]?.status).toBe('cancelled')
    expect(() => authorizeStorageMove(cancelled, 'B-91', 'lab manager')).toThrow()
  })
})
