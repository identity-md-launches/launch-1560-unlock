# Additional UNLK adversarial tests

This contribution adds tests only. The accepted implementation, dependencies, configuration,
manifest, protected checks, and existing tests are unchanged. All new actors are explicitly
local fixtures. No public transaction, owner signature, fork, or live service admission is
represented by these tests.

## Source provenance

Fetched the archive of
[`identity-md-launches/launch-1534-unlock` at `f0149886ac3c09b57a0e1d676582e6aeaeb7a69f`](https://github.com/identity-md-launches/launch-1534-unlock/tree/f0149886ac3c09b57a0e1d676582e6aeaeb7a69f)
on 2026-10-13. All **498** published files match the existing workspace byte-for-byte;
their modes and contents reconstruct Git tree `0710257dd00656d130b4c56b7a669734955bb1ef`.
Archive SHA-256: `6c0be8006d6dcc81d7e79d9028fff6cbc0b50b3c3c909bc80c8f9118f561ecd6`.
The workspace's accepted contribution was preserved; no Git metadata was rewritten.

Read the supplied token/hook protected checks, the Pashov and Trail of Bits property-testing
references, the Uniswap v4 security reference, and `docs/SIZE_FIX.md`, `docs/DEPLOYMENT.md`,
and `docs/SECURITY_REVIEW.md`. The property models below apply their conservation,
state-transition, boundary-input, and withdrawal-liveness guidance.

## Added coverage

`TokenLedgerProperties.t.sol` covers:

- Name, symbol, decimals, fixed issuance, and initially unsealed distribution receipts.
- The documented pool-rounding band, a delegated final allocation, and preservation of
  historical receipts after all inventory returns to the minter and is redistributed.
- Self-transfers, zero transfers, the final positive wei, failed final transfers, and
  allowance rollback after an invalid receiver or insufficient balance.
- A four-account independent balance/allowance model over random direct/delegated/full
  transfers, approval replacement/revocation, and exact expected failure selectors.
  Finite approvals are consumed; infinite approvals persist; receipts remain sealed.
- End-of-sequence liveness: all holders can return their inventory and transfer the
  entire fixed supply again without rewriting the launch receipts.

`FeeCustodyProperties.t.sol` covers the official pool's factory fee custody using the
existing vendored IMD factory and real v4 manager. It starts with the actual token-only
seed and **no artificial quote-liquidity position**:

- Executed buys and permitted sales generate both native and token LP fees. Manager
  balance changes independently corroborate the factory's returned collected amounts.
- Exact 80/20 distribution, including rounding; account-bound unpaid payer fees;
  network liabilities following the configured recipient; requester transfers; and
  recipient overlap under random sequences.
- Rejecting native recipients cannot consume liabilities or prevent the other recipient's
  payout. ERC-20 payouts remain independent of ETH reception. Retrying pays the rightful
  address, including after it has given away its future fee rights.
- Reentrant account/network withdrawals and reentrant fee collection cannot pay twice.
  Deterministic tests assert that the callbacks actually execute.
- Forced ETH and donated UNLK remain surplus, never distributable fee credit. Random
  collection and withdrawal sequences conserve both assets, retain locked principal,
  settle every manager delta, and create no fee-recipient sale quota.
- Unauthorized requester changes, a zero new requester, and an unknown launch fail with
  their specified errors. Every sequence ends by paying all outstanding liabilities
  once recipients accept ETH, leaving only donations in factory custody.

Both campaigns set **256 runs × 64 calls** and `fail-on-revert = true` in the Solidity
files. Expected failures use exact selectors/data; unexpected reverts fail the suite.
The rounding property uses **1,000 fuzz runs**. There is no `vm.setEnv`, skipped test,
storage patch, etched contract, mocked target call, or silent catch in either new file.

## Reproduction and results

With Foundry 1.8.3 and the existing Solidity 0.8.26/Cancun configuration:

```sh
forge build
forge test
forge test --match-path test/TokenLedgerProperties.t.sol
forge test --match-path test/FeeCustodyProperties.t.sol
python3 -B -m unittest discover -s test -p 'test_release_artifacts.py' -v
python3 -B scripts/generate_code_checks.py --check
sha256sum -c docs/SOURCE_SHA256SUMS
```

The supplied protected checks can additionally be run with
`python3 -B scripts/check_protected.py` while the task's `.imd/reads` inputs are present.
They are worker-provided inputs, not a dependency of the submitted test suite.

During this path-restricted assignment, generated artifacts/cache were placed in
`test/scratch/` using `FOUNDRY_OUT` and `FOUNDRY_CACHE_PATH`. Existing Python checkers'
artifact lookups were redirected there in memory, or supplied isolated artifact copies;
no checked-in configuration, checker, or protected Solidity input was edited.

Fresh results are retained in `test/results/`: build, combined suite, protected checks,
and artifact/release-gate validation. The starting suite passed **175 tests**; the final
combined run passed **186 tests across 41 suites**, with **zero failures or skips**. The added
suite consists of nine unit/fuzz tests and five invariant properties in two Foundry
invariant groups. Both new campaigns completed **16,384 calls with zero unexpected
reverts**. All **11 protected checks** and **five Python release-gate tests** passed.

All six published creation/runtime template hashes, constructor lengths, ABI hashes,
and EVM size limits match. The hook remains **24,328 runtime / 25,830 full initcode
bytes**; the helper remains **728 runtime / 756 initcode bytes**. All original source
digests and the four companion/token `ReviewedCode` hashes pass unchanged.

## Limits

These are local reproducible checks, not independent audit or production-safety claims.
No new implementation defect was demonstrated by the added properties. The existing
release limitations remain: sustained-price manipulation, protocol-fee-triggered official
trading halt, treasury quota-bearing reward rounds, and other-pool bypass. The inherited
delivery record still lists pending platform admission, launch allocation data, independent
review, and an executable owner activation path. This test contribution supplies no public
deployment addresses, transactions, source verification, or sealed activation evidence.
