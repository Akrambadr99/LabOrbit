import { describe, expect, it } from 'vitest'
import { sampleTriage } from './collectionTriage'
import { sampleById, seedSampleCollection, setFreezerAvailability } from './sampleCollection'
import { reopenQuality } from './sampleLedger'

describe('sample triage states', () => {
  it('distinguishes quality evidence, storage review and reserved records without mutation', () => {
    const collection = seedSampleCollection()
    const before = JSON.stringify(collection)
    const policy = sampleTriage(collection)
    expect(policy.state(sampleById(collection, 'B-91'))).toBe('evidence-blocked')
    expect(policy.state(sampleById(collection, 'B-92'))).toBe('review-open')
    expect(policy.state(sampleById(collection, 'B-94'))).toBe('reserved')
    expect(JSON.stringify(collection)).toBe(before)
  })
  it('shows freezer outage ahead of reservation or review labels', () => {
    const collection = seedSampleCollection()
    const changed = setFreezerAvailability(collection, 'FRZ-02', false, 1).collection
    expect(sampleTriage(changed).state(sampleById(changed, 'B-92'))).toBe('freezer-unavailable')
    expect(sampleTriage(changed).state(sampleById(changed, 'B-93'))).toBe('review-open')
  })
  it('detects stale and revision-mismatched review evidence outside the open-only inbox', () => {
    const collection = seedSampleCollection()
    const record = sampleById(collection, 'B-92')
    const policy = sampleTriage(collection)
    expect(policy.state({ ...record, ledger: reopenQuality(record.ledger, record.id) })).toBe('review-stale')
    expect(policy.state({ ...record, ledger: { ...record.ledger, revision: record.ledger.revision + 1 } })).toBe('review-stale')
  })
  it('recognizes authorized and unreserved states while keeping domain search fields', () => {
    const collection = seedSampleCollection()
    const record = sampleById(collection, 'B-94')
    const policy = sampleTriage(collection)
    expect(policy.state({ ...record, ledger: { ...record.ledger, movedSampleId: record.id } })).toBe('authorized')
    expect(policy.state({ ...record, ledger: { ...record.ledger, freezerReservation: null } })).toBe('unreserved')
    expect(policy.searchText(record)).toBe('B-94 cold FRZ-09')
    expect(policy.revision(record)).toBe(record.ledger.revision)
  })
  it('keeps the collection navigable when one sample has incomplete lineage evidence', () => {
    const collection = seedSampleCollection()
    const record = sampleById(collection, 'B-94')
    const incomplete = { ...record, ledger: { ...record.ledger, nodes: record.ledger.nodes.filter(node => node.id !== 'A-03') } }
    expect(sampleTriage(collection).state(incomplete)).toBe('evidence-blocked')
    expect(sampleTriage(collection).state(sampleById(collection, 'B-92'))).toBe('review-open')
  })
})
