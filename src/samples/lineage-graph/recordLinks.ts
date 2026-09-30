import type { SampleCollection } from './sampleCollection'

type Record = SampleCollection['samples'][number]
function selected(path: string, id: string) { return path + (path.includes('?') ? '&' : '?') + 'record=' + encodeURIComponent(id) }
export function recordDetailPath(record: Record) { return selected('/samples/' + record.id + '/lineage', record.id) }
export function recordDecisionPath(record: Record) { return selected('/samples/' + record.id + '/storage/' + record.freezerId + '/move', record.id) }
