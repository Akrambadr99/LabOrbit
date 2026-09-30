import { array, booleanValue, nonEmptyText, nonNegativeInteger, nullable, object,
  oneOf, optional, text, uniqueBy } from '../../workspace/storageValidation'
import type { CustodyEvent, SampleNode } from './custody'
import type { FreezerRecord, SampleCollection, SampleRecord } from './sampleCollection'
import type { SampleLedger, StorageReview } from './sampleLedger'

const node = object<SampleNode>({ id: nonEmptyText, parentId: optional(text),
  type: oneOf('primary', 'aliquot', 'assay'), qc: oneOf('pass', 'hold', 'pending') })
const transfer = object<CustodyEvent>({ id: nonEmptyText, sampleId: text, from: text, to: text, at: text, witness: text })
const reservation = object<NonNullable<SampleLedger['freezerReservation']>>({ slotId: text, sampleId: text })
const review = object<StorageReview>({ id: nonEmptyText, sampleId: text, slotId: text,
  sourceRevision: nonNegativeInteger, requestedBy: text, assignee: text,
  status: oneOf('open', 'stale', 'completed', 'cancelled', 'superseded'), supersedesId: optional(text) })
const history = object<SampleLedger['history'][number]>({ revision: nonNegativeInteger, action: text,
  sampleId: text, actor: optional(text) })
const ledger = object<SampleLedger>({ nodes: uniqueBy(array(node), 'id'), transfers: uniqueBy(array(transfer), 'id'),
  movedSampleId: nullable(text), freezerReservation: nullable(reservation), reservationOwner: nullable(text),
  storageReviews: optional(uniqueBy(array(review), 'id')), revision: nonNegativeInteger, history: array(history) })
const sample = object<SampleRecord>({ id: nonEmptyText, zone: text, freezerId: text, ledger, archived: booleanValue })
const freezer = object<FreezerRecord>({ id: nonEmptyText, revision: nonNegativeInteger,
  available: booleanValue, sampleIds: array(text) })
const audit = object<SampleCollection['audit'][number]>({ action: text, id: text, related: array(text) })

// Pending QC, unavailable freezers, and incomplete lineage evidence remain recoverable domain states.
export const sampleCollectionRule = object<SampleCollection>({ samples: uniqueBy(array(sample), 'id'),
  freezers: uniqueBy(array(freezer), 'id'), audit: array(audit) })
