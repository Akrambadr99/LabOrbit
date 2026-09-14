import { requireThat } from '../workspace/values'
export const workflowKey = "reagent-stock"
export const workflowLabel = "Reagent reserve"
export const ruleKind = "reserve"
export interface ReagentStockRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: ReagentStockRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured >= record.limit, 'Available reagent units fall below Minimum reagent units.')
  requireThat(record.evidence.trim().length >= 8, 'Reagent reserve require traceable evidence.')
  requireThat(record.revision > 0, 'Reagent reserve require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
