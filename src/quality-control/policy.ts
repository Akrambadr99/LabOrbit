import { requireThat } from '../workspace/values'
export const workflowKey = "quality-control"
export const workflowLabel = "Quality control limits"
export const ruleKind = "threshold"
export interface QualityControlRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: QualityControlRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Control deviation exceed Maximum control deviation.')
  requireThat(record.evidence.trim().length >= 8, 'Quality control limits require traceable evidence.')
  requireThat(record.revision > 0, 'Quality control limits require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
