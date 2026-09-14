import { requireThat } from '../workspace/values'
export const workflowKey = "sample-accession"
export const workflowLabel = "Sample accession capacity"
export const ruleKind = "capacity"
export interface SampleAccessionRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: SampleAccessionRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Incoming sample count exceed Available accession slots.')
  requireThat(record.evidence.trim().length >= 8, 'Sample accession capacity require traceable evidence.')
  requireThat(record.revision > 0, 'Sample accession capacity require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
