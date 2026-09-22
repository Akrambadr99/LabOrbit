import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { storageManagers } from './storageWorkload'
import { archiveSample, claimSampleReviews, claimSampleStorage, readSampleCollection, sampleInbox, sampleRows,
  saveSampleCollection, setFreezerAvailability } from './sampleCollection'

export function SampleCollectionPage() {
  const [collection, setCollection] = useState(() => readSampleCollection(window.localStorage))
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('active')
  const [manager, setManager] = useState('manager-aya'); const [checked, setChecked] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const selectedId = params.get('sample') ?? 'B-92'; const selected = collection.samples.find(item => item.id === selectedId)
  function choose(id: string) { setParams(current => { const next = new URLSearchParams(current); next.set('sample', id); return next }) }
  function persist(next: typeof collection, message: string) { setCollection(saveSampleCollection(window.localStorage, next)); setNotice(message) }
  function run(action: () => typeof collection, success: string) {
    try { persist(action(), success) } catch (error) { setNotice(error instanceof Error ? error.message : 'Sample operation failed.') }
  }
  return <main className="suite-page"><header className="suite-title"><div><small>LAB / STORAGE RESPONSIBILITY</small>
    <h1>Sample storage workspace</h1><p>Independent lineage records connected to freezer capacity and named storage review.</p></div></header>
    <section className="metrics" aria-label="Sample summary">
      <article><small>Active samples</small><strong>{collection.samples.filter(item => !item.archived).length}</strong></article>
      <article><small>Storage reviews</small><strong>{sampleInbox(collection).length}</strong></article>
      <article><small>Freezers</small><strong>{collection.freezers.length}</strong></article>
    </section>
    <section className="suite-card" aria-label="Storage queue"><h2>Storage review queue</h2>
      {sampleInbox(collection).length ? <ul>{sampleInbox(collection).map(item => <li key={item.sampleId + item.reviewId}>
        <button onClick={() => { choose(item.sampleId) }}>{item.sampleId}</button> · {item.slotId} ·
        {item.assignee} · {item.actionable ? 'actionable' : 'blocked'}</li>)}</ul> : <p>No open storage reviews.</p>}
      <label>Storage manager <select value={manager} onChange={event => { setManager(event.target.value) }}>
        {storageManagers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </section>
    <section className="suite-card" aria-label="Sample collection"><h2>Samples</h2>
      <label>Search samples <input value={query} onChange={event => { setQuery(event.target.value) }} /></label>
      <label>Show <select value={filter} onChange={event => { setFilter(event.target.value) }}><option value="active">Active</option>
        <option value="archived">Archived</option><option value="all">All</option></select></label>
      {sampleRows(collection, query, filter).length ? <ul>{sampleRows(collection, query, filter).map(record => <li key={record.id}>
        <label><input type="checkbox" checked={checked.includes(record.id)} onChange={event => {
          setChecked(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))
        }} /> Select {record.id}</label>
        <button aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => { choose(record.id) }}>
          {record.id} · {record.zone}</button> · ledger r{record.ledger.revision} · {record.freezerId}
        {record.archived ? ' · archived' : ''}</li>)}</ul> : <p>No samples match this view.</p>}
      <button disabled={!checked.length} onClick={() => { const result = claimSampleReviews(collection, checked, manager)
        persist(result.collection, `${String(result.updated.length)} claimed; ${String(result.skipped.length)} skipped; ${String(result.blocked.length)} blocked.`)
      }}>Claim selected storage reviews</button>
    </section>
    <section className="suite-card" aria-label="Selected sample"><h2>{selected?.id ?? 'Select a sample'}</h2>{selected && <>
      <p>{selected.zone} · ledger r{selected.ledger.revision} · freezer {selected.freezerId}</p>
      <p>Reservation {selected.ledger.freezerReservation?.slotId ?? 'none'} · manager {selected.ledger.storageReviews?.find(item => item.status === 'open')?.assignee ?? 'unassigned'}</p>
      <button onClick={() => { run(() => claimSampleStorage(collection, selected.id, manager, selected.ledger.revision), 'Storage review claimed.') }}>Claim selected storage review</button>
      <button onClick={() => { const freezer = collection.freezers.find(item => item.id === selected.freezerId)
        if (!freezer) return
        try { const result = setFreezerAvailability(collection, freezer.id, !freezer.available, freezer.revision)
          persist(result.collection, `${String(result.updated.length)} related samples updated; ${String(result.blocked.length)} blocked.`)
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Freezer update failed.') }
      }}>Toggle linked freezer availability</button>
      <button onClick={() => { run(() => archiveSample(collection, selected.id), 'Sample archived.') }}>Archive sample</button>
      <details><summary>Lineage history</summary><ol>{selected.ledger.history.map(item =>
        <li key={item.revision}>{item.action} · r{item.revision} · {item.sampleId}</li>)}</ol></details>
    </>}</section>
    <section className="suite-card" aria-label="Sample audit"><h2>Collection audit</h2><ol>{collection.audit.toReversed().slice(0, 8).map((item, index) =>
      <li key={index}>{item.action} · {item.id} · {item.related.join(', ') || 'none'}</li>)}</ol></section>
    <p role="status">{notice}</p>
  </main>
}
