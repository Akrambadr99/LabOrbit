export interface SampleNode { id: string; parentId?: string; type: 'primary' | 'aliquot' | 'assay'; qc: 'pass' | 'hold' | 'pending' }
export interface CustodyEvent { id: string; sampleId: string; from: string; to: string; at: string; witness: string }
export const sampleNodes: readonly SampleNode[] = [
  { id: 'SMP-2048', type: 'primary', qc: 'pass' },
  { id: 'A-03', parentId: 'SMP-2048', type: 'aliquot', qc: 'pass' },
  { id: 'B-91', parentId: 'A-03', type: 'assay', qc: 'pending' },
]
export const custodyEvents: readonly CustodyEvent[] = [
  { id: 'CE-1', sampleId: 'SMP-2048', from: 'Intake', to: 'Freezer-2', at: '2026-09-14T08:00', witness: 'K. Lin' },
  { id: 'CE-2', sampleId: 'A-03', from: 'Freezer-2', to: 'Bench-4', at: '2026-09-14T10:00', witness: 'D. Rao' },
]
export function ancestorIds(id: string, nodes: readonly SampleNode[]): string[] {
  const ancestors: string[] = []
  let current = nodes.find(item => item.id === id)
  const seen = new Set([id])
  while (current?.parentId) {
    if (seen.has(current.parentId)) throw new Error('Lineage contains a cycle.')
    ancestors.push(current.parentId)
    seen.add(current.parentId)
    current = nodes.find(item => item.id === current?.parentId)
    if (!current) throw new Error('Lineage parent is missing.')
  }
  return ancestors
}
export function custodyFinding(event: CustodyEvent, history: readonly CustodyEvent[]): string | null {
  if (!event.witness.trim()) return 'A receiving witness is required.'
  if (event.from === event.to) return 'Custody transfer needs a different destination.'
  const latest = history.filter(item => item.sampleId === event.sampleId).at(-1)
  if (latest && event.from !== latest.to) return `Current location is ${latest.to}.`
  if (latest && event.at <= latest.at) return 'Transfer time must follow the last custody event.'
  return null
}
export function releaseFindings(id: string, nodes: readonly SampleNode[], history: readonly CustodyEvent[]): string[] {
  const lineage = [id, ...ancestorIds(id, nodes)]
  const findings: string[] = []
  for (const member of lineage) {
    const node = nodes.find(item => item.id === member)
    if (node?.qc !== 'pass') findings.push(`${member} quality control is ${node?.qc ?? 'missing'}.`)
    if (!history.some(item => item.sampleId === member)) findings.push(`${member} has no custody evidence.`)
  }
  return findings
}
