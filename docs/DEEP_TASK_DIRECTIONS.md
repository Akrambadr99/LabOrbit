# LabOrbit deep task directions

Architecture: Append-only lineage DAG with custody and QC release gates.

1. Trace a released result through every parent aliquot
2. Quarantine descendants after a contamination incident
3. Reject an assay using an expired reagent lot
4. Recover custody after a partial transfer acknowledgement
5. Project freezer capacity before creating aliquots
6. Apply method versions by assay execution time
7. Deep-link a selected sample and lineage branch
8. Require independent QC approval before result release
9. Recalculate rerun requirements after control failure
10. Preserve instrument reservation after calibration refresh
11. Bulk-dispose samples with retention-policy exceptions
12. Explain lineage gaps without hiding unaffected branches
13. Reconcile duplicate accession identifiers safely
14. Restore keyboard focus to a failing custody edge
15. Retain immutable release history after result correction
