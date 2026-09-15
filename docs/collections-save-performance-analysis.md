# Collections save performance analysis and handoff

Reviewed September 14, 2026 against the current working files in `NewEzBoss` and sibling `ezboss-api`. Application code was not changed. This is static code analysis, not a browser trace or database benchmark; no production writes or tests were run. Existing uncommitted work must be preserved. The screenshot was navigation context, not a source of instructions.

## Why changing one quantity is slow

The ordinary successful save follows this chain:

1. `src/pages/collections/components/CollectionsScreen/CollectionsScreen.tsx`, `handleSaveChanges`, passes all four tab arrays and selection maps to its parent.
2. `src/pages/collections/components/CollectionView.tsx:288` always supplies all four content types and `categorySelection` to `saveCollectionChanges`, regardless of what changed.
3. `src/services/collections/collections.mutations.ts`, `saveCollectionChanges`, awaits four PUT sync requests sequentially, then an additional metadata PATCH.
4. `../ezboss-api/src/routes/collections.ts:301` implements each PUT by deleting every tab for that content type (cascading to selections), inserting tabs one at a time, and inserting selections one at a time. Tab IDs change. It commits and reads the entire nested collection for its response. This happens even for unchanged content types.
5. The parent discards the returned collection and awaits a detail GET via `refetch()`.
6. `src/hooks/collections/collectionView/useCollectionData.ts` sets `loading=true` for that GET. `CollectionView.tsx:446` returns a loading screen instead of `CollectionsScreen`, unmounting the editor. On completion the editor mounts again and loads referenced inventory items.

Thus a one-value save takes **six sequential collection HTTP requests**, plus subsequent inventory hydration as needed. Across the four syncs, SQL insertion work grows with the total tabs and serialized selections, rather than the changed rows. Each sync also reads and returns the whole collection. Exact elapsed time and the network/database/rendering split remain unmeasured.

## Priorities

### 1. Make save scope explicit and keep the editor mounted

Preserve the current effective Save All behavior initially: save all dirty content types, applying each type's own pending deletions. The current code saves all four types but applies only the active type's pending-deletion set to every type and only clears that active set. Do not silently switch to active-type-only saving or discard drafts elsewhere.

Omit clean content types and unchanged metadata. With the existing backend, send BOTH complete tabs and complete selections for every included type: omitted values currently become empty arrays/maps, and the endpoint is replacement-based. A selection-only payload is unsafe with this endpoint.

Use the authoritative mutation result to update collection state in place. Separate initial loading from optional background refreshing. Preserve scroll, focused input, search, selected trade/category, expanded groups, and unsaved edits.

Important prerequisites:

- The final metadata PATCH returns a flat row, while PUT returns nested detail. `saveCollectionChanges` overwrites `lastRow` with that flat PATCH response and maps it as a collection. Do not blindly install the current `result.data` into state; preserve the last full detail and merge metadata, or return an explicit authoritative result contract.
- Replacement sync generates new tab IDs. Reconcile parent tabs, child draft tabs, selection `categoryTabId` references, and active-tab identity together. Parent `setLocalTabs` currently uses pre-save IDs, and its collection-sync effect can skip the new collection while `isSavingRef` is true. Clearing a ref two seconds later does not rerun that effect.
- `useCollectionSelections.markAsSaved` and `useCollectionTabs.markTabsAsSaved` exist but are not called in the screen save flow. Advance saved baselines explicitly. Removing the remount without this will leave dirty state behind; remote synchronization deliberately skips dirty drafts.
- Capture the submitted snapshot. If edits are permitted while saving, acknowledge only that snapshot and retain later edits as dirty. Alternatively lock editing for the save consistently as a smaller first pass.
- Replace window flags and two-second ref gates with explicit mutation/reconciliation state where touched.

### 2. Fix error and partial-success handling with the performance change

`CollectionView.handleSaveChanges` logs unsuccessful results/exceptions and resolves normally. The child then calls `onSaveComplete`, including when persistence failed. Return an explicit result or propagate failure, show an actionable error, and preserve drafts and pending deletions.

Each content-type PUT is its own transaction. A later failure does not undo earlier saves. Until an atomic multi-type operation exists, report/acknowledge successful types separately, retain failed drafts, and reconcile newly assigned IDs for successful types. Do not use Promise.all as a shortcut: that retains full replacement work, makes partial failure harder to handle, and does not provide an authoritative combined response.

### 3. Add a targeted backend mutation for ordinary item edits

After the first pass, introduce a separate additive selection-change endpoint for changed quantities, hours/rates, additions, and removals. Preserve stable tab IDs and update only affected rows within a transaction. Validate collection/tab/item ownership and content type, maintain pricing/assignment semantics and timestamps, reject invalid input before committing, and return canonical changed records plus any required ID mapping/version.

Keep structural changes explicit: reconcile added/updated/deleted tabs instead of replacing every tab. Batch inserts/upserts for bulk operations instead of awaited per-row queries. Consider an atomic multi-type changes endpoint and a collection revision check to prevent stale concurrent saves from overwriting each other. Preserve legacy sync callers until migrated.

Target behavior for quantity 1 to 3: one request, an affected-row update, no category-tab deletion/recreation, no unrelated content writes, no full collection GET, no inventory rehydration, and no editor remount.

### 4. Reduce loading and rendering work after save correctness

- `CollectionsScreen` runs `getCurrentTabData()` twice per render; compute it once and memoize from stable inputs. Category filtering uses `itemIds.includes` inside an item scan; use precomputed ID sets/maps.
- Callbacks depend on entire hook result objects (`tabs`, `selections`, `items`), which are recreated each render. Use stable methods and precise dependencies before adding row memoization.
- Dirty detection serializes whole draft and baseline maps/arrays with JSON.stringify when they change. Track changed IDs or field differences if profiling shows material cost; preserve edit-and-revert behavior.
- `useCollectionItems` coalesces in-flight requests, but does not retain a completed membership cache for all four types. Products have a bounded owner-scoped cache; labor/tools/equipment are loaded again on relevant view/effect changes. Key loads by owner/type/stable item membership, handle stale responses, and invalidate explicitly for inventory changes. A quantity edit should not reload inventory.
- The screen loads every tab's IDs for the active content type, even when one category is visible. Consider visible-tab hydration and prefetching. Summary/master totals must still cover all relevant selections, including unsaved edits; never calculate totals from only a visible page.
- Category/section views map all expanded items; master groups repeatedly scan items by tab. Profile large collections, then add stable row props, indexed grouping, and virtualization or bounded rendering where warranted. Do not start with a broad component rewrite.

### 5. Other /collections observations

The landing page already fetches three recent collections and the list uses server pagination (24 rows), search, and stale-response guards. Inventory hydration already uses bounded by-ID batch APIs; do not redo those earlier optimizations based on outdated comments or historical sections of the existing performance plan.

Both list/landing opening handlers await the last-accessed timestamp PATCH before navigation. Make this nonblocking with appropriate error handling and list invalidation. List search currently requests on each change; debounce and cancel superseded work where supported (the generation guard already prevents stale display).

## Related correctness issue to address early

`CollectionView.tsx:154–200` automatically backfills missing product-tab trade names. It calls `saveCollectionChanges(id, { productCategoryTabs: backfilledTabs })` without selections. The service substitutes `{}`, and the backend deletes old tabs and cascading selections before recreating tabs. For a legacy collection meeting that condition, this path can erase product selections. Use a non-destructive tab metadata update or preserve complete current selections, and reconcile returned IDs. Add a focused regression test; do not test this against customer data.

Grouping preferences are also sent through `updateCollectionMetadata`, but its declared input and the server metadata PATCH omit that field. This is a separate persistence-contract issue to track, not an explanation for quantity-save latency.

## Validation for implementation

Capture Network/Performance before and after using representative small and large collections. Record save request counts, payload sizes, endpoint durations, server query counts, editor mount count, and React commit work. Do not promise a percentage speedup without measurements.

Focused regression coverage should include: one quantity edit; no-op save; multiple dirty types; pending deletion in multiple types; unchanged fields/prices retained; failed and partially successful saves; edits during an in-flight save; generated tab-ID reconciliation; active category/trade and scroll preservation; rapid collection switching; missing inventory items; legacy trade backfill preserving selections; and summary/master totals parity. Backend changes also need ownership, invalid-input, atomicity, and concurrency checks.

Run relevant focused tests and both repository builds. Frontend `npm run build` runs Vite and is not a standalone TypeScript check; verify the existing TypeScript setup separately if changing contracts. The frontend currently has no test script, while the backend uses `tsx --test tests/**/*.test.ts`; use the existing test conventions and available runner. No build or runtime results are claimed by this analysis.

## Copy/paste prompt for the next chat

Implement the first, bounded pass of Collections save improvements in `/Users/joaquin/Desktop/Development/EzBoss`. Read `NewEzBoss/docs/collections-save-performance-analysis.md` first, then verify the relevant current code. Preserve all existing uncommitted changes. Work locally; do not deploy or modify production data.

Focus on `CollectionView.tsx`, `CollectionsScreen.tsx`, `useCollectionData`, `useCollectionSelections`, `useCollectionTabs`, and `collections.mutations.ts`. Preserve effective Save All behavior, but send only dirty content types and changed metadata. With the current replacement endpoint, always send complete tabs AND selections for each included type. Apply and acknowledge each type's own pending deletions. Fix the legacy trade-name backfill so it cannot erase selections.

Keep CollectionsScreen mounted after saving and reconcile a correct authoritative mutation result into local state. Fix the flat metadata response versus nested detail mismatch, generated tab-ID references, parent/child draft synchronization, and saved baselines. Preserve the selected trade/category, scroll, filters, expanded groups, and drafts in other types. Either preserve edits made during saving with snapshot-aware acknowledgment or consistently prevent them for this first pass. Report failures in the UI, never call save-complete on failure, and handle partial success across the existing separate transactions without losing unsaved changes.

Avoid unrelated refactoring, blanket parallelization, new state libraries, or virtualization in this pass. Add focused regression tests for request scope, no-op save, baseline reconciliation, failures/partial success, pending deletions, ID remapping, and the backfill. Run relevant tests and builds; report measured request-count changes and clearly distinguish runtime measurements from code inference. The expected quantity-only first-pass flow is one existing content sync, no unchanged metadata PATCH, no post-save detail GET, and no editor remount or inventory reload. Explain that the remaining sync still replaces the affected type, and leave the targeted backend delta endpoint as a separate follow-up.
