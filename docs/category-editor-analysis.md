# Category editor investigation — September 14, 2026

The product editor's trades-only display has a concrete frontend cause: `getFullCategoryHierarchy` previously fetched trades through the Postgres API while fetching sections, categories, subcategories, types, and sizes directly from Firestore. Its strict parent-ID comparisons joined legacy document IDs against new SQL IDs. Child query failures were also converted into empty arrays, so an unsuccessful load looked like an empty hierarchy.

`GenericCategoryEditor` is used by labor, tools, and equipment. Its existing adapters already use Postgres. It previously loaded trades, then one section request per trade, one category request per section, and (except labor) one subcategory request per category. It silently skipped unsuccessful child responses. The product-specific Firestore mismatch does not explain missing children in these other modules; API failures, owner/item-type filters, and missing migrated rows must be distinguished.

## Changes

- Both editors now use the existing authenticated, owner-scoped hierarchy API/cache for every level. Products make six parallel level requests; labor makes three; tools/equipment make four.
- A shared tree builder normalizes numeric IDs and uses maps scoped by level. Construction is linear in the number of rows, replacing repeated array scans and positional joins. Missing parents produce a visible error instead of silently losing rows.
- Expansion, search, editing, and React keys include the level: independent SQL tables can all contain ID `1`. API calls continue receiving the original numeric-string ID.
- Load errors have a retry action. Responses from obsolete loads cannot replace newer results. Search rendering reuses the ancestor set instead of repeatedly traversing descendants.
- Product rename, usage, and delete operations now use the API, replacing remaining Firestore operations. Creation already used the API.
- Sizes are created under trades, matching the API and SQL foreign key. Types are leaves.
- The shared deletion dialog no longer claims inventory items will be deleted. The checked-in schema uses default foreign-key restrictions for inventory references; these can block deletion until items are reassigned. The API route's existing comment claiming those references are automatically nulled is inconsistent with that schema.

## Migration finding and remaining verification

`ezboss-api/scripts/migration/migrate-inventory.ts` reads `products`, `tool_items`, `equipment_items`, and `labor_items`, then resolves hierarchy nodes from names on each item. It does not copy standalone category collections. Unused categories can therefore be absent after migration. Labor items with missing cached hierarchy names are explicitly recorded as exceptions. Trades are shared among item types, while all child levels are item-type scoped; a trade can legitimately have no children in one module.

No live database query, migration, or data mutation was performed. To distinguish omitted data from filtering issues, compare the affected owner's API rows with the original category collections, including unused nodes and migration exceptions. Any recovery should be additive and preserve current SQL IDs and inventory links; rerunning destructive migration scripts is not a suitable first repair.

Additional API hardening identified during review: hierarchy rename/delete/usage handlers select nodes by ID without an owner predicate; creation should also validate parent ownership and item type. These pre-existing backend issues were not modified in this frontend repair.

## Validation

- Production Vite build passed.
- Ten regression tests passed: all hierarchy levels, numeric/string IDs, overlapping table IDs, ancestry for creation, sizes under trades, invalid parents, module scoping/request counts, surfaced child API failures, and API-based product management.
- Full TypeScript checking still fails elsewhere in the existing workspace. No diagnostics remain in the changed editor/service files.
- Authenticated browser behavior and live migrated row completeness remain unverified.
