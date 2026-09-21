import { describe, expect, it } from 'vitest'
import { ancestorIds, custodyEvents, custodyFinding, custodySequence, releaseFindings, sampleNodes } from './custody'
describe('sample lineage and custody', () => {
  it('traverses ancestors to the original sample', () => {
    expect(ancestorIds('B-91', sampleNodes)).toEqual(['A-03', 'SMP-2048'])
  })
  it('blocks gaps in append-only custody transfers', () => {
    expect(custodyFinding({ id: 'CE-3', sampleId: 'A-03', from: 'Intake', to: 'Bench-5', at: '2026-09-14T11:00', witness: 'K. Lin' }, custodyEvents))
      .toBe('Current location is Bench-4.')
  })
  it('requires a witness and monotonic transfer time', () => {
    expect(custodyFinding({ id: 'CE-3', sampleId: 'A-03', from: 'Bench-4', to: 'Bench-5', at: '2026-09-14T09:00', witness: '' }, custodyEvents)).toMatch(/witness/)
    expect(custodyFinding({ id: 'CE-3', sampleId: 'A-03', from: 'Bench-4', to: 'Bench-5', at: '2026-09-14T09:00', witness: 'K. Lin' }, custodyEvents)).toMatch(/follow/)
  })
  it('inherits quality and custody gates', () => {
    expect(releaseFindings('B-91', sampleNodes, custodyEvents)).toEqual(['B-91 quality control is pending.', 'B-91 has no custody evidence.'])
    const passed = sampleNodes.map(item => item.id === 'B-91' ? { ...item, qc: 'pass' as const } : item)
    const history = [...custodyEvents, { id: 'CE-3', sampleId: 'B-91', from: 'Bench-4', to: 'Assay', at: '2026-09-14T11:00', witness: 'K. Lin' }]
    expect(releaseFindings('B-91', passed, history)).toEqual([])
  })
})
describe('chain-of-custody sequencing compatibility', () => {
  it('selects the first incomplete step', () => expect(custodySequence([
    { id: 'a', order: 1, complete: true }, { id: 'b', order: 2, complete: false },
  ])?.id).toBe('b'))
  it('skips blocked steps', () => expect(custodySequence([
    { id: 'a', order: 1, complete: false, blocked: true }, { id: 'b', order: 2, complete: false },
  ])?.id).toBe('b'))
  it('returns undefined when complete', () => expect(custodySequence([{ id: 'a', order: 1, complete: true }])).toBeUndefined())
  it('rejects duplicate order', () => expect(() => custodySequence([
    { id: 'a', order: 1, complete: false }, { id: 'b', order: 1, complete: false },
  ])).toThrow())
})
