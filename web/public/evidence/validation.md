# UNLOCK website · worker validation

Checked 2026-10-14 against existing Sepolia launch 1560, chain 11155111. This record describes the worker’s own checks and limitations; it is not independent certification or an audit. No public transaction, token/pool deployment, mainnet interaction or change to IMD Explorer was performed.

## Delivered and reconciled

React 19, TypeScript, Vite source and exact npm lockfile are in `web/`; the production static export is in root `dist/`. Its assets are relative, fonts/brand images are local, and navigation uses hash routes. The export was exercised under `/preview/`, not only at an origin root. No backend, private credential, relay project ID, node_modules, package cache, registry mirror, dependency archive or submodule is required in the submission. No ignore file was changed.

Read-only GitHub reconciliation returned main `ea89426f3fe9df79096a5e02345fc8821bd1c783`, the supplied accepted source. Existing Solidity source, Foundry configuration, dependencies, `.github`, `.git` and environment files were preserved. The contributor publisher performs GitHub/IPFS hosting from the submitted `dist/`; the worker did not produce a hosting URL or CID.

## Build and executable checks

| Check | Actual result |
| --- | --- |
| `npm --prefix web run typecheck` | Passed, strict `tsc --noEmit` |
| `npm --prefix web test` | 8 passed, 0 failed: exact units/floors/caps, scenarios, all tiers/large values, inputs/slippage, oracle state labels, authentic Merkle trees and recorded live arithmetic |
| `npm --prefix web run build` | Passed; Vite production export in `dist/`, no source maps or external font dependency |
| `forge build --skip test --skip script` | Passed using unchanged Solidity configuration |
| `npm --prefix web run verify:chain` | All recorded checks passed at block 11912346; canonical token/hook ABI hashes and all shipped frontend/download ABI copies, five normalized runtime matches, reciprocal bindings, activated setup, supply/decimals, exact PoolKey/PoolId, existing buy receipt |
| `npm --prefix web run verify:live` | At block 11912146, three real actual-payer buy `eth_call` simulations match exact input, output and fee; three nonzero holders’ quota arithmetic agrees with the hook; all 459 native round-0 proofs verify and reconstruct its unique-recipient root |
| `forge test --match-contract 'TradingTest\|SeedBoundaryTest\|NativeLaunchTest\|ClaimLifecycleInvariants\|OracleTest\|CreditsAndFeesTest' -vv` | 49 tests passed in 6 suites, 0 failures |
| `forge test --match-contract 'NativeWithdrawalTest\|NativeCustodyInvariantsTest\|QuotaInvariantTest' -vv` | 15 tests passed in 3 suites, 0 failures; includes direct-route contract-wallet native custody and withdrawals |
| `node --import tsx scripts/check-swap-math.ts` (in `web/`), then `forge test --match-contract FrontendSwapMathTest -vv` | 14 exact BigInt vectors passed against the vendored Solidity v4 `SwapMath`: both directions, one-wei inputs, large inputs, full and partial fills |
| `node --import tsx scripts/check-allowance-math.ts` (in `web/`), then `forge test --match-contract FrontendAllowanceTest -vv` | 43 ledger vectors passed against actual `UnlkHook.remainingQuota` in the existing local fixture: all tiers, transfers with E=0, balances below quota, used quota, zero balances, uint256 extremes and the separate full-unlock bit |
| Public RPC availability | Three configured endpoints returned Sepolia chain ID, with CORS, in direct read-only checks; see `rpc-check.json` |

The two cross-language generators retain their source in `web/scripts/` and write disposable Solidity fixtures only to `test/scratch/`. Artificial ledger boundaries are local tests, never public state overrides. Existing contract compilation emitted a pre-existing mutability suggestion for `UnlkHook.afterInitialize`; no contract source was changed.

The live verification snapshot records p=2500, tier=0, full unlock=false. Oracle FDV was unavailable because its checkpoint was stale; the UI represents that as unavailable, without turning it into a zero price or denying otherwise valid trades. The real seed range and quote capacity come from the live launch; older illustrative values in historical documentation are not used as current data.

The existing successful buy is `0x595a858a472215ec90b12ef0f30fa193daae4f17fa9ddb83269b6a1214e101ab`. A separate existing native claim was discovered and checked: `0x3b87a1665c4377f5afded9325f14335458b55ee7081a2cdad62dd54907da4470`, block 11906558. Neither was sent by this worker. The full public sell and claim → attest → sync paths remain unproven by this worker; local tests and read-only simulations are not represented as public proofs.

## Rendered and interaction checks

Chromium, Playwright 1.55.1, axe-core Playwright 4.10.2. Browser tooling and downloaded browser dependencies were outside the repository. Reports: `browser-validation.json`, `wallet-validation.json`, `recovery-validation.json`; reproducible scripts are in `web/scripts/`.

- All seven routes rendered at 320, 390, 768 and 1440 CSS pixels: 28 page/width combinations, no horizontal overflow, recorded script error or missing local asset. Local display/body fonts loaded. Screenshots were captured in disposable `test/scratch/browser/` and inspected, including the 390px home, trade, connected allowance/rewards and desktop composition.
- Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks ran on all seven routes **at 390px** with zero reported violations. Empty violation arrays at other widths do not imply an axe audit there; the report explicitly marks the audited widths.
- Mobile navigation and main Trade entry, wallet dialog opening/Escape, Buy/Sell selection, input/slippage, scenario 35% and final results, transfer-only E=0 scenario, FAQ pointer/keyboard disclosure, holder search, activity filtering and skip-link focus passed. Connection remains available before RPC resolution, including offline.
- EIP-6963 test provider exposes only an existing public address and rejects every signing/send attempt. Connection requested only accounts and chain. Wrong-network switching, live actual-trader buy quote/fee/gas, 45-second expiry, slippage invalidation, exact router approval review, rejected send/no resend, account-change invalidation and native-claim deduplication passed. No private key was used and no transaction was broadcast.
- With the first two RPC endpoints intentionally unavailable, the third real public RPC completed runtime/binding/state reads. With the IMD proof API intentionally unavailable, the bundled authentic tree was checked against the live native root. These are real fallback reads, not fabricated chain data.
- Stored pending receipt state survived reload and exposed manual checking without send/sign calls. Releasing the pending-response fixture confirmed the existing real buy receipt and cleared storage. An explicitly injected reverted response produced the reverted/gas-spent explanation and cleared pending storage. Pending/reverted fixtures test UI behavior only; they are not public transaction evidence.

The pinned entry-page probe was run from the root:

```sh
IMD_PLAYWRIGHT=/tmp/unlk-browser/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/unlk-browser-binaries \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

Result: **16/16 passed**. The 390px first screen visibly contains UNLOCK, its plain product explanation, Trade UNLK and the connect control. The probe measured no overlap, clipped text, obstructing floating control or overflow; all measured text met 4.5:1 (3:1 for large text). It measured six font sizes, two families, natural tracking and 27 words of first-screen prose at 390px. All measured controls met the 24px-or-spacing rule; eight links/branding targets were below the optional 44px comfortable size. Primary controls use at least 44–48px. Title, favicon, description, og:title and a locally rendered og:image were present. The compact probe report is `design-probe.json`.

## Better Interface review: all six domains

Applied the pinned guide during construction, including the unattended workflow, all six core-principle sections and document-web-design method. Supporting guidance covered focus/dialogs, forms, responsive tables, numeric data, colors and transaction/error states. The source-specific review is consolidated here rather than split among agents.

| Domain | Coverage and final source references | Findings and correction |
| --- | --- | --- |
| Accessibility | Native buttons/links/dialog/details, labels, landmarks, skip link and route focus (`web/src/App.tsx:72`, `web/src/wallet.tsx:90`); visible focus (`web/src/styles.css:92`), named progress, mobile table labels, reduced motion (`web/src/styles.css:1634`) | Route/skip focus originally risked moving to the wrong hash or away from the first screen. Focus now preserves route and uses `preventScroll`; keyboard tests pass. Added a textual space across the display line break (`web/src/pages.tsx:50`) for a correct accessible heading name. Mobile table headers now remain in the accessibility tree, with explicit column scopes, instead of being removed by `display: none` (`web/src/styles.css:2026`, `web/src/pages.tsx:940`). Dialog Escape and focus behavior were inspected. Physical screen-reader use and native zoom remain unperformed. |
| Layout | Editorial home, early main action, trade form first on phones, content-based breakpoints at 1250/1090/760/440 (`web/src/styles.css:1649`), wrapped exact identifiers, labeled table rows | Testnet notice needed to remain visible while scrolling. It is sticky, and scroll padding reserves its space (`web/src/styles.css:48`, `:311`). Layout/probe checks found no overlaps or overflow at tested sizes. The 390px screenshot confirms product/action on the first screen. |
| Writing | English labels beside W/E/S/p, sell allowance versus balance, testnet disclosure, exact spender/amount/deadline, earned/indicative/pending separation, disclosure of bypass/manipulation/governance (`web/src/pages.tsx:255`, `:630`, `:1080`) | Wording avoids calling wallet tokens escrowed/locked and separates router credit from delivered wallet ETH. Existing native claim discovery was reconciled into progress; the unproven sell/full reward flow stays explicitly pending. No guaranteed price, return or date. |
| Typography | Local DM Sans and Instrument Serif, six sizes, 400/500/600 weights, tabular numbers, bounded prose width (`web/src/styles.css:1`, `:38`, `:188`) | No extra decorative type sizes, tracked uppercase kickers or fabricated chart labels. Chart positions use event timestamps; invalid prices are excluded rather than replaced by zero (`web/src/charts.tsx:6`). Probe measured six sizes/two families at both entry widths. Exact consequential values appear in reviews; shortened presentation values retain the full value in the `Amount` title. |
| Colors | Ink/paper/cyan/champagne roles, scoped light form theme, text plus color state cues, forced-colors support (`web/src/styles.css:23`, `:776`, `:2227`) | Initial paper-form token inheritance produced insufficient contrast. The form now scopes dark foreground values explicitly. Rendered axe checks on all seven mobile routes and the probe’s solid-background contrast check pass. Dynamic wallet-extension UI is outside the page’s styling/coverage. |
| UI | Explicit connect/review/sign stages, simulation and gas before each write, loading/error states, account invalidation, optional storage, proof verification/deduplication, receipt recovery (`web/src/wallet.tsx:278`, `web/src/Trade.tsx:86`, `web/src/Rewards.tsx:209`) | Prevented same-wallet refresh flicker and disabled stale reads; optional storage failures cannot break connection. Cancelled/replaced transactions do not falsely complete the original action. Fixed a one-wei/large-input fee attribution discrepancy uncovered by Solidity differential testing (`web/src/math.ts:139`). All applicable primary interaction findings were repaired and rerun. |

`DESIGN.md` documents the implemented tokens, type, spacing, shapes, components, responsive rules and motion. Attribution/license text is retained in `web/NOTICE.md` and `web/licenses/design-guidance.txt`.

Two test-harness timing issues were repaired: holder filtering now waits for the loaded holder table, and the expiry assertion waits for the actual review control to disappear rather than matching the always-visible secondary refresh button. These were test races, not silently discarded assertions. Final browser/wallet reports contain no errors. Reproduction scripts create their output directories, so a fresh checkout does not depend on worker-only artifacts.

## Limits and unperformed checks

WebKit did not complete. Its standard launch reported missing system libraries. An additional attempt with libraries installed outside the repository reached an EGL-display failure (`Could not create WPE EGL display: EGL_SUCCESS`); Safari/iPhone rendering is not claimed. Chromium mobile sizes are viewport checks, not physical phones. Physical MetaMask/Rabby extensions, Coinbase passkey signing, mobile deep-link handoff, a screen reader, native browser zoom, and transaction replacement UI were not exercised end to end. Smart-wallet routing/custody is covered by existing local contract tests and an EIP-1193 direct-address implementation, not by a live passkey transaction.

No public approval, sell, withdrawal, checkpoint, milestone update, new claim, attestation, synchronization or certification was signed. Public round 0 was already certified; later-round import/chunk certification is implemented against actual methods but not executed publicly. Unavailable/live external services can still change or fail. The complete small current event history was indexed from block 11906181; future large histories may take longer or be partial, and the UI labels coverage. Current holder count means nonzero discovered addresses excluding zero; it includes infrastructure and is not a count of people. Pagination is implemented, but current live data does not fill multiple holder pages.

A static export does not operate an oracle keeper. Invalid oracle data blocks new milestones, not previously earned rights. External governance, sustained-price manipulation, alternate pools and treasury reward-round powers remain project risks, documented and linked rather than asserted away.
