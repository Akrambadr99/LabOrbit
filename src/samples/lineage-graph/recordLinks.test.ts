import { expect, it } from 'vitest'
import { evaluateScenario } from '../freezer-moves/scenario'
import { seedSampleCollection } from './sampleCollection'
import { recordDecisionPath } from './recordLinks'

it('keeps sample identity and a valid zero-count initial storage scenario', () => {
  for (const record of seedSampleCollection().samples) {
    const url = new URL(recordDecisionPath(record), 'https://test.invalid')
    expect(url.searchParams.get('record')).toBe(record.id)
    expect(url.pathname).toContain('/storage/' + record.freezerId + '/move')
    expect(() => evaluateScenario(Number(url.searchParams.get('aliquots') ?? '0'))).not.toThrow()
  }
})
