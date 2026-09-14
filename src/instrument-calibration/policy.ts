import { requireThat } from '../workspace/values'
export const workflowKey = "instrument-calibration"
export const workflowLabel = "Instrument calibration validity"
export const ruleKind = "freshness"
export interface InstrumentCalibrationRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: InstrumentCalibrationRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Calibration age (days) exceed Maximum calibration age.')
  requireThat(record.evidence.trim().length >= 8, 'Instrument calibration validity require traceable evidence.')
  requireThat(record.revision > 0, 'Instrument calibration validity require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
