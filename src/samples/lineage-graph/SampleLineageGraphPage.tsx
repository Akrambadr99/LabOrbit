import { SelectedRecordRoute } from './SelectedRecordRoute'
import { useRecordContext } from '../../workspace/RecordScope'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ancestorIds, custodyFinding, releaseFindings } from './custody'
import type { CustodyEvent } from './custody'
import { passQuality, readSampleLedger, recordCustody, reopenQuality, saveSampleLedger } from './sampleLedger'
function RecordContent() {
  const { storage, guard, recordId } = useRecordContext()

  const { sampleId } = useParams()
  const [ledger, setLedger] = useState(() => readSampleLedger(storage))
  const nodes = ledger.nodes
  const history = ledger.transfers
  const [selectedId, setSelectedId] = useState(recordId)
  const [witness, setWitness] = useState('')
  const [notice, setNotice] = useState('')
  const findings = releaseFindings(selectedId, nodes, history)
  const proposed: CustodyEvent = { id: 'CE-' + String(history.length + 1), sampleId: selectedId,
    from: history.filter(item => item.sampleId === selectedId).at(-1)?.to ?? 'Bench-4',
    to: 'Assay', at: history.some(item => item.sampleId === selectedId)
      ? new Date(Date.parse((history.filter(item => item.sampleId === selectedId).at(-1)?.at ?? '2026-09-14T10:00').replace(/Z$/, '') + 'Z') + 60 * 60 * 1000).toISOString().slice(0, 16)
      : '2026-09-14T11:00', witness }
  function recordTransfer() {
    const finding = custodyFinding(proposed, history)
    if (finding) { setNotice(finding); return }
    setLedger(saveSampleLedger(storage, recordCustody(ledger, proposed)))
    setNotice(`${selectedId} custody transfer recorded.`)
  }
  function recordQuality() {
    setLedger(saveSampleLedger(storage, passQuality(ledger, selectedId)))
    setNotice(`${selectedId} quality control passed.`)
  }
  function reopen() {
    try { setLedger(saveSampleLedger(storage, reopenQuality(ledger, selectedId))); setNotice(`${selectedId} quality reopened.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Reopening failed.') }
  }
  return <div className="suite-page">
    <header className="suite-title"><div><small>SAMPLES / APPEND-ONLY EVIDENCE</small>
      <h1>Sample lineage and custody graph</h1>
      <p>Sample {sampleId ?? 'SMP-2048'} · Review the selected lineage record</p>
    </div></header>
    <section className="suite-card" aria-label="Sample lineage">
      <h2>Lineage</h2>
      <label>Review node <select value={selectedId} onChange={event => { setSelectedId(event.target.value); }}>
        {nodes.map(node => <option key={node.id} value={node.id}>{node.id} · {node.type}</option>)}</select></label>
      <p>Ancestors: {ancestorIds(selectedId, nodes).join(' → ') || 'original sample'}</p>
      <ul>{nodes.map(node => <li key={node.id}>{node.type === 'aliquot' ? 'Aliquot ' : node.type === 'assay' ? 'Assay ' : 'Primary sample '}{node.id} · QC {node.qc}</li>)}</ul>
    </section>
    <section className="suite-card" aria-label="Custody and quality">
      <h2>Custody verified for recorded transfers</h2>
      <p>Lineage revision {ledger.revision} · Storage move {ledger.movedSampleId ?? 'pending'}</p>
      <ol>{history.map(event => <li key={event.id}>{event.sampleId}: {event.from} → {event.to} · {event.witness}</li>)}</ol>
      <label>Receiving witness <input value={witness} onChange={event => { setWitness(event.target.value); }} /></label>
      <button onClick={guard(recordTransfer)}>Record transfer to Assay</button>
      <button onClick={guard(recordQuality)}
        disabled={nodes.find(node => node.id === selectedId)?.qc === 'pass'}>Record QC pass</button>
      {nodes.find(node => node.id === selectedId)?.qc === 'pass' && <button onClick={guard(reopen)}>Reopen QC</button>}
      <h3>Release findings</h3>
      {findings.length ? <ul>{findings.map(item => <li key={item}>{item}</li>)}</ul> : <p>Release gates pass.</p>}
      <p role="status">{notice}</p>
    </section>
  </div>
}

export function SampleLineageGraphPage() { return <SelectedRecordRoute><RecordContent /></SelectedRecordRoute> }
