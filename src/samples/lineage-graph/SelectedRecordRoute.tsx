import type { ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RecordScope } from '../../workspace/RecordScope'
import { openSelectedRecord } from './selectedRecord'

export function SelectedRecordRoute({ children }: { children: ReactNode }) {
  const [params] = useSearchParams()
  const route = useParams()
  const sample = route['sampleId']
  const id = params.get('record') ?? (sample && sample !== 'SMP-2048' ? sample : 'B-91')
  return <RecordScope id={id} back={'/laboratory/sample-workspace?sample=' + encodeURIComponent(id)}
    open={target => openSelectedRecord(window.localStorage, target)}>{children}</RecordScope>
}
