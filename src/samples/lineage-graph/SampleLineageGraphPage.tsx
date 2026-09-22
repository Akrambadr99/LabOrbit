import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ancestorIds, custodyFinding, releaseFindings } from './custody'
import type { CustodyEvent } from './custody'
import { passQuality, readSampleLedger, recordCustody, reopenQuality, saveSampleLedger } from './sampleLedger'
export function SampleLineageGraphPage() {
  const { sampleId } = useParams()
  const [ledger, setLedger] = useState(() => readSampleLedger(window.localStorage))
  const nodes = ledger.nodes
  const history = ledger.transfers
  const [selectedId, setSelectedId] = useState('B-91')
  const [witness, setWitness] = useState('')
  const [notice, setNotice] = useState('')
  const findings = releaseFindings(selectedId, nodes, history)
  const proposed: CustodyEvent = { id: 'CE-' + String(history.length + 1), sampleId: selectedId,
    from: history.filter(item => item.sampleId === selectedId).at(-1)?.to ?? 'Bench-4',
    to: 'Assay', at: '2026-09-14T11:00', witness }
  function recordTransfer() {
    const finding = custodyFinding(proposed, history)
    if (finding) { setNotice(finding); return }
    setLedger(saveSampleLedger(window.localStorage, recordCustody(ledger, proposed)))
    setNotice(`${selectedId} custody transfer recorded.`)
  }
  function recordQuality() {
    setLedger(saveSampleLedger(window.localStorage, passQuality(ledger, selectedId)))
    setNotice(`${selectedId} quality control passed.`)
  }
  function reopen() {
    try { setLedger(saveSampleLedger(window.localStorage, reopenQuality(ledger, selectedId))); setNotice(`${selectedId} quality reopened.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Reopening failed.') }
  }
  return <div className="suite-page">
    <header className="suite-title"><div><small>SAMPLES / APPEND-ONLY EVIDENCE</small>
      <h1>Sample lineage and custody graph</h1>
      <p>Sample {sampleId ?? 'SMP-2048'} → Aliquot A-03 → Assay batch B-91</p>
    </div></header>
    <section className="suite-card" aria-label="Sample lineage">
      <h2>Lineage</h2>
      <label>Review node <select value={selectedId} onChange={event => { setSelectedId(event.target.value); }}>
        {nodes.map(node => <option key={node.id} value={node.id}>{node.id} · {node.type}</option>)}</select></label>
      <p>Ancestors: {ancestorIds(selectedId, nodes).join(' → ') || 'original sample'}</p>
      <ul>{nodes.map(node => <li key={node.id}>{node.id} · QC {node.qc}</li>)}</ul>
    </section>
    <section className="suite-card" aria-label="Custody and quality">
      <h2>Custody verified for recorded transfers</h2>
      <p>Lineage revision {ledger.revision} · Storage move {ledger.movedSampleId ?? 'pending'}</p>
      <ol>{history.map(event => <li key={event.id}>{event.sampleId}: {event.from} → {event.to} · {event.witness}</li>)}</ol>
      <label>Receiving witness <input value={witness} onChange={event => { setWitness(event.target.value); }} /></label>
      <button onClick={recordTransfer}>Record transfer to Assay</button>
      <button onClick={recordQuality}
        disabled={nodes.find(node => node.id === selectedId)?.qc === 'pass'}>Record QC pass</button>
      {nodes.find(node => node.id === selectedId)?.qc === 'pass' && <button onClick={reopen}>Reopen QC</button>}
      <h3>Release findings</h3>
      {findings.length ? <ul>{findings.map(item => <li key={item}>{item}</li>)}</ul> : <p>Release gates pass.</p>}
      <p role="status">{notice}</p>
    </section>
  </div>
}
