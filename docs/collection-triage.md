# Collection triage and navigation

The sixteenth development pass adds a navigable collection view without changing domain mutation or permission rules.

## Shareable view

Example: `/laboratory/sample-workspace?sample=B-93&q=cold&state=review-open&sort=revision-desc`.

The URL owns search (q), lifecycle (show), domain work state (state), sort order (sort), page and page size (size). Unsupported values fall back to safe defaults. Search is limited to 200 characters; page size is 5, 10 or 25. Search updates replace the current history entry; deliberate view changes use browser history. Changing search, scope, work state, sorting or size restarts at the first page. An out-of-range page displays the last available page without deleting records.

Both selected-record workflow links carry the current collection context. Their Back to workspace link restores that context after reload. The working record is never silently replaced when it is outside the current page. Its detail panel explains the scope and offers Show selected record.

## Domain interpretation

The work-state facet prioritizes unavailable freezers, stale or revision-mismatched storage reviews, and missing quality/custody evidence before authorized moves. Current review, reserved and unreserved work remain distinct. Search covers sample, zone and freezer identity. Legacy SMP-2048 detail routes retain their existing B-91 alias.

Work-state labels are triage summaries, not authorization decisions. All claims, source propagation, archive checks, revision conflicts and bulk outcomes still use the existing domain services.

## Explicit bulk scope

Checkbox selection is transient UI state, not persisted domain data. Filtering, sorting and changing pages preserve checked IDs and show how many are outside the current page. Bulk actions still include every checked record. Select this page and Clear this page operate only on visible IDs; Clear selection clears the entire checked set. Reloading or leaving the collection clears checkboxes, while the URL view and working record survive.

## Interaction and accessibility

Controls have visible labels, native keyboard behavior and responsive wrapping. View options progressively disclose page size. Page/result counts and bulk scope use polite announcements without adding a second application action-status region. Empty views explain recovery; Reset view clears view constraints while retaining the selected record. Workflow status is readable text, not color-only.

## Verification

The domain collectionTriage.test.ts suite checks seed interpretation, unavailable linked sources, stale evidence precedence and domain search/revision projection. e2e/sixteenth-pass.spec.ts covers reload/history, both workflow round trips, hidden selection, bounded pagination and empty recovery, and captures a tablet-width screenshot. The complete validation report records final suite results; this document alone does not assert that full gates have passed.
