import { requireThat } from '../workspace/values'
export const workflowKey = "method-version"
export const workflowLabel = "Analytical method version"
export const ruleKind = "dependency"
export interface MethodVersionRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: MethodVersionRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured === record.limit, 'Run method revision does not match Approved method revision.')
  requireThat(record.evidence.trim().length >= 8, 'Analytical method version require traceable evidence.')
  requireThat(record.revision > 0, 'Analytical method version require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
