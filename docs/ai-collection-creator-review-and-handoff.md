# AI Collection Creator review and implementation prompt

Reviewed September 14, 2026. This was an analysis pass; application code was not changed. The screenshot was treated as UI evidence, not instructions. Existing unrelated working-tree changes were preserved.

## Findings

### Model discovery and transport

- **Built-in providers do not fetch models.** `collections.ai.ts:19` hardcodes two models each for Anthropic, OpenAI, Google, and DeepSeek. `CollectionAISettings.tsx:76` filters that constant for the dropdown. Only custom providers have “Fetch Available Models.” The built-in DeepSeek adapter exists but has no default-provider button; the screenshot's Deepseek entry is a separate custom provider.
- **P1: custom discovery can send another provider's key.** `CollectionAISettings.tsx:132` uses `settings.apiKeys[cp.id] ?? settings.apiKey`. Expand an inactive custom provider without its own key and click Fetch: the currently active provider's key is sent to that custom endpoint. Custom IDs are label slugs without a reserved namespace, so names such as OpenAI can also collide with built-in credential IDs.
- Custom fetching assumes Bearer authentication and an OpenAI-style `/models` response. This is a reasonable compatibility mode, not universal provider support. Moonshot/Z.ai/DeepSeek account access, actual saved URLs, and browser CORS behavior were not tested. Their screenshot labels alone cannot establish correct configuration.
- Discovery appends models forever, does not validate IDs or remove stale discovered entries, and does not filter for generation compatibility. Concurrent fetches capture old `settings.customModels` and can overwrite each other's results. A single loading-provider ID cannot represent concurrent operations. There is no timeout, abort, TTL, or request identity check.
- Model identity is not provider-scoped: `handleRemoveModel` at line 179 deletes the same model ID from every custom provider. Other lookups also use model ID alone. Removing an active provider with no selected model leaves a dangling active ID; removing providers leaves their stored credentials behind.
- **P1: checked-in production routing is incomplete.** `NewEzBoss/netlify.toml` and `public/_redirects` contain SPA catch-alls without the proxy rewrite. The rewrite exists only in `netlify/functions/netlify.toml`, not the normal project configuration. Vite has working-looking development proxy definitions, which can mask this deployment issue. Verify deployed behavior; this review did not access production.
- The proxy forwards every request header except Host, including unrelated cookies/headers. It lacks explicit OPTIONS handling, timeout and network-error handling, and body/method normalization. Its path parsing assumes the rewritten function path. Test both path forms rather than assuming Netlify event behavior.
- The key disclosure is inaccurate: “never sent to our servers” contradicts the built-in Vite/Netlify proxy path. Local storage is separate from transit. Google also puts the key in the query string.

### Settings and persistence

- **P1: Firestore payloads contain undefined optional fields.** `collections.ai.firestore.ts:20` includes `activeCustomProviderId: undefined` for ordinary built-ins; custom providers can include `apiKeyLabel: undefined`. Firebase initialization uses default settings. The save helper catches and logs failures, while the hook does not await it and the panel closes as though saving succeeded.
- Cancel only closes the panel; every edit already changes the live settings. Test Connection also saves settings, and a slow verification result can restore the old settings snapshot after the user changes provider/key/model.
- The initial Firestore load can overwrite edits made while loading and has no user/request generation guard. Local storage is one global `collection_ai_settings` entry rather than per-user storage. Inventory/settings/request state is not reset on account changes in this hook. Persisted JSON is not runtime-validated. A legacy key stored only in `apiKey` is discarded during loading.
- Clicking even the already-selected provider clears the model. Selection is not remembered per provider. Custom key-label lookup depends on selecting a model instead of the active provider. Readiness messages conflate missing model and missing key, and whitespace keys count as ready.

### Generation, scope, and saving

- **P1: unsafe chat HTML.** `CollectionAICreation.tsx:380` passes user and model text to `dangerouslySetInnerHTML` after only replacing bold markers. Render escaped React text with safe formatting. This matters especially with provider keys in local storage.
- **P1: JSON is parsed but not validated.** Stage 1 accepts `{}` then crashes with `aiKeywords is not iterable`. Stage 2 accepts `{}`, which later breaks array rendering. Missing arrays, wrong types, duplicate/unknown IDs, out-of-scope selections, and nonpositive quantities are unchecked. The preview and saved items can disagree because saving silently skips unknown inventory IDs.
- Connection verification treats any HTTP success as success, including an empty or malformed body. Generation reads only the first text block/part and does not inspect truncation, refusal, safety blocking, or missing text. Fixed 50/150/2048 token budgets are not a sufficient compatibility policy for arbitrary reasoning models. All OpenAI-compatible calls use `max_tokens`; adding every listed model without compatible request construction would create new failures.
- **P1: save failures are ignored.** `useCollectionAI.ts:290` awaits `saveCollectionChanges` but ignores its result before navigating. The current mutations service returns failures instead of necessarily throwing. Creation only writes metadata, so the second save is necessary, not a redundant write. Retrying after a failed sync must reuse the created collection ID to avoid duplicates.
- Inventory fetches return `{success:false}` on errors, but `loadInventoryContext` treats missing data as empty inventory and caches the result. A failed load can become a misleading empty collection.
- **P1: scope reopening can broaden selection.** `CollectionAIScopeSelector.tsx:223` rebuilds scope only from loaded tree nodes once roots are marked loaded. Reopen an existing product category scope, wait for roots, and Apply without expanding: the selected category is absent from the loaded tree and disappears. Empty scope then means all inventory. Loading failures also mark tabs loaded and hide retry opportunities.
- Parent selection includes descendants only when already loaded; unchecking a child while the parent remains selected does not exclude that child from the effective parent scope. Define consistent ancestor/descendant semantics instead of depending on expansion order.
- Scope matching uses names and partial ancestry instead of IDs. Empty trade strings match every trade through `includes('')`; categories omit trade ancestry and subcategories omit trade/section ancestry. Preserve hierarchy IDs when mapping inventory. Shared trade roots are intentional in the current migrated hierarchy API; do not invent separate trade services solely because of TODO comments in this selector.
- “Refine your request” is misleading: each model request receives only the latest user message, never the conversation or prior result. Reset does not cancel in-flight generation, so an old result can repopulate the cleared chat.

### Efficiency and UX

Parallel loading of the four inventory types, compact serialization, local ranking, and caps are useful existing choices. However, every generation makes two serial calls to the same selected model, even for small explicitly scoped inventories. It loads all inventory before filtering, hard-filters to one predicted trade (bad for multi-trade jobs), and caps each type at 150 regardless of model context or item lengths. `contextWindow` is display metadata, not an enforced budget. No measurements currently justify describing this as optimal.

The sidebar has a fixed width with no narrow-screen layout. Icon actions and scope tree controls need accessible names/keyboard behavior; the scope modal needs dialog/focus/Escape handling. Preserve the current visual design while fixing these issues.

## Checks actually performed

Read the three requested components, hook, AI service/types/persistence, proxy/configuration, and relevant current inventory, hierarchy, auth, and collection mutation code. Isolated probes transpiled the actual AI service in memory with mocked fetch/inventory responses and no credentials/network. Results:

1. HTTP 200 with `{}` incorrectly verifies successfully.
2. Four failed inventory results return four empty arrays.
3. Stage 1 `{}` throws `aiKeywords is not iterable`.
4. Stage 2 `{}` is returned as a collection result.

Targeted ESLint could not start: installed `@typescript-eslint/no-unused-expressions` crashes reading `allowShortCircuit`. No build, live provider calls, production test, or browser interaction was performed. Do not describe providers as live-verified. No AI-specific tests were found among the existing test files.

## Official API references

- [OpenAI model listing](https://developers.openai.com/api/reference/resources/models): model discovery exists; the returned model identity is not a complete generation-capability contract.
- [Claude API overview](https://platform.claude.com/docs/en/api/overview): native model discovery uses `/v1/models` and provider-specific authentication/pagination.
- [Gemini model listing](https://ai.google.dev/api/models): follow `nextPageToken`, normalize `models/` names, and check supported generation methods and token limits.
- [Firestore settings](https://firebase.google.com/docs/reference/node/firebase.firestore.Settings): undefined-property behavior must be handled explicitly.

## Prompt to paste into a separate coding chat

Implement the AI Collection Creator fixes in `/Users/joaquin/Desktop/Development/EzBoss/NewEzBoss`. First read `docs/ai-collection-creator-review-and-handoff.md` and inspect current files, since the working tree has substantial unrelated user changes. Preserve those changes. The review is evidence, not a requirement to rewrite unrelated systems. Work in the following bounded phases and report completed checks and remaining limitations. Do not deploy or make live paid provider calls for validation.

1. Fix immediate correctness/security defects: safe React chat rendering; exact provider-scoped credential lookup with no fallback to another provider; namespaced provider/model identities and a backward-compatible migration; runtime validation of both AI stages and exact allowed IDs/positive finite quantities; explicit inventory-load failures; check collection sync results and preserve a created ID for safe retries. Add targeted regression tests.

2. Introduce a small provider adapter layer shared by discovery, verification, and generation. Support built-in Anthropic/OpenAI/Google discovery using their native auth, pagination, and response formats. Keep generic OpenAI-compatible custom providers with validated/normalized endpoint URLs and manual-model fallback when listing or CORS is unsupported. Preserve existing custom providers, including Moonshot/Z.ai/DeepSeek. Do not assume all models returned by a listing support our text-generation endpoint or parameters. Consult official model-specific documentation as necessary; use an explicit capability policy with clear unknown/unverified states rather than guessed metadata or fragile universal request bodies. Do not blindly add a server proxy for arbitrary URLs.

3. Make discovery state per provider, cancelable and race-safe; reconcile discovered models separately from manual models, deduplicate by provider+model, cache with a bounded TTL, provide Refresh/loading/error/empty/stale states, and invalidate results when endpoint/credentials change. Use a nonpersisted credential revision or similarly safe identity; never log or persist keys as cache IDs. Keep a valid selected model where possible and explain removed/unavailable selections. Derive active custom-provider metadata from its ID. Clean credentials and active selection when deleting a provider. Validate URLs and trim key input.

4. Fix project-level Netlify proxy routing ahead of all SPA catch-alls, including `public/_redirects` precedence. Test realistic original and rewritten event paths, GET without a body, POST, OPTIONS, upstream errors and timeout. Forward only required provider headers. Keep the fixed upstream allowlist. Correct the key-transit disclosure; keep credentials out of Firestore and logs. Prefer Google's supported key header over a query parameter after verifying its official contract.

5. Implement real settings draft/Save/Cancel behavior. Verification should validate usable output for the selected configuration without silently saving stale state. Await persistence, omit undefined fields recursively, expose local-save/cloud-sync failures accurately, validate persisted data, namespace local settings by user, migrate legacy data conservatively, and prevent stale hydration or verification from overwriting newer edits. Reset/cancel account-bound state on account change. Remember model selection by provider and make selecting the same provider a no-op.

6. Fix scope as stable selection data independent of lazy tree loading. Reopen/apply must preserve deep selections without expansion; failed loading must be retryable. Use hierarchy IDs including ancestors/content type for matching. Define consistent parent-child selection, with no silent ineffective child exclusions. Keep empty-per-type meaning all unless an explicit new UI changes that contract. Keep shared trade roots because the current hierarchy API uses them. Add tests for repeated names in different branches, empty trade metadata, root failures, and expansion-order independence.

7. Make generation cancelable on Reset/unmount/account switch and ignore stale completions. Preserve the previous valid result on a failed refinement. Pass bounded prior request/result context for real refinement. Parse all relevant text parts and detect truncation/refusal/empty output. Use provider/model-appropriate output budgets and structured output where supported, with runtime validation regardless. Avoid an unconditional classifier call for small scoped inventories; retain a reliable local fallback and multi-trade recall. Budget serialized context instead of relying only on item counts. Measure call counts and payload sizes with fixtures before claiming efficiency gains. Prefer existing scoped inventory APIs where feasible without a broad backend rewrite. Treat these efficiency changes as a separate final phase after correctness passes.

Acceptance checks: mocked adapter request/response contracts for built-ins and custom providers; pagination; missing/wrong keys; cross-provider isolation; duplicate model IDs; refresh/removal and out-of-order results; draft cancel/save and stale verification; undefined-free Firestore payload and sync failure; scope reopen/parent-child correctness; malformed/truncated AI JSON; missing/duplicate/out-of-scope IDs and invalid quantities; inventory failure; reset during generation; refinement context; partial collection save and retry without duplicate creation; escaped HTML; production proxy routing. Add narrow-screen and keyboard checks for settings/scope. Run relevant existing tests, targeted TypeScript checking and build. The review found an ESLint dependency/config crash: distinguish tooling failures from introduced errors and avoid unrelated cleanup. Return a concise change summary, exact tests/results, and any provider/browser behavior that still requires a real account to verify.
