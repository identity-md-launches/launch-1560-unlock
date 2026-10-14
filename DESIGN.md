# UNLOCK website design

## Overview

The site is an English public interface to existing Sepolia launch 1560: an editorial experiment page and a practical trading workspace. The visual idea is a precise, open diamond paired with a visible acquisition formula. A restrained financial tone, generous spacing and source-linked data carry the experience; the site does not promise returns or encourage holding.

The implemented source is `web/src/`. `dist/` is the production export. The seven hash routes are Experiment, Trade, My Unlock, Milestones, Holders & activity, How it works and Transparency. Public reads never require a wallet. A champagne banner persistently identifies Sepolia test assets.

## Colors

`web/src/styles.css` is the canonical token source. The single default theme is deep ink; the editorial explanation and trade form use a warm paper surface with scoped foreground tokens.

| Token                                   | Value     | Role                                                   |
| --------------------------------------- | --------- | ------------------------------------------------------ |
| `--ink`                                 | `#101b24` | Page background and dark foreground on paper           |
| `--surface`                             | `#172630` | Oracle, notices and grouped controls                   |
| `--surface-hover`                       | `#20343f` | Hover feedback                                         |
| `--paper`, `--text`                     | `#f3f0e7` | Primary text; paper surfaces                           |
| `--text-muted`                          | `#adbcc3` | Secondary text on ink                                  |
| `--line`                                | `#344650` | Separators and control boundaries                      |
| `--accent`, `--accent-solid`, `--focus` | `#8edbd4` | Primary action, visible focus, allowance/data emphasis |
| `--accent-text`                         | `#10292a` | Text on cyan actions                                   |
| `--gold`                                | `#dac89c` | Emblem, editorial emphasis and testnet strip           |
| `--warning`                             | `#edcb8e` | Warning text/borders on dark backgrounds               |
| `--error`                               | `#ffb4aa` | Errors on dark backgrounds                             |
| `--emblem-fill`                         | `#1a383e` | One restrained geometric facet                         |

The paper trade form scopes `--text` to `#101b24`, muted text to `#50616a`, its primary action to `#142c33`, focus to `#145f5a`, warning to `#785215` and error to `#a52b22`. Its input/background token is `#f3f0e7`, with `#e8e6de` and `#e2e4dc` for grouped/hover surfaces. Use these scoped roles rather than borrowing dark-theme text colors. The initial inheritance defect in this surface was fixed and rendered contrast was rechecked.

Colors never stand alone for state: status labels, selected button states, achieved marks and written errors accompany them. The measured contrast and accessibility results are in `web/public/evidence/validation.md`.

## Typography

Local WOFF2 files in `web/src/assets/fonts/` supply DM Sans variable normal and Instrument Serif normal/italic at 400. The license texts are in `web/public/fonts/`.

- DM Sans, Arial, sans-serif: body, controls, labels and numeric data. Weights used are 400, 500 and 600.
- Instrument Serif, Georgia, serif: display and editorial headings; 400 normal/italic. Do not synthesize bold serif headings.
- System monospace: code and exact identifiers only, at the existing small/body sizes.

Six size tokens: `--small: 13px`, `--body: 16px`, `--subhead: 20px`, `--heading: 28px`, `--large: 40px`, `--display: 88px`. At 760px and below, display becomes 56px. The compact rule illustration uses 40px below 440px. Body line height is 1.6, headings 1.12 and the hero 1.02–1.03. Display tracking is −0.03em; ordinary heading tracking is −0.02em; body text has natural spacing. Long prose is limited to 72ch, or 75ch in the FAQ.

Changing values use tabular numbers. Monetary/token calculations remain BigInt; formatting is presentation only. `Amount` provides the full exact decimal value in its title; consequential transaction reviews display exact amounts directly. Full contract addresses and PoolId wrap without clipping. Inputs remain at least 16px, with larger amount-entry text.

## Layout

The main content width is `min(100% - 80px, 1240px)`, with 48px/80px vertical padding. A small spacing vocabulary—4, 8, 12, 16, 20, 24, 28, 32, 40, 48 and 64px—organizes controls and editorial groups. Large editorial separations reach 80px; the bottom home composition uses a 100px column gap.

Implemented breakpoints:

- At 1250px: header/content insets and column gaps tighten.
- At 1090px: navigation becomes an explicit menu; the editorial row stacks; home statistics become two columns.
- At 760px: main insets become 20px; the hero stacks; the trade form moves ahead of market context; wallet, scenario, contract and FAQ compositions adapt; tables become labeled vertical rows. The quote form and connect action stay early in reading order.
- At 440px: main insets become 16px, header branding becomes compact, oracle details stack, and the wallet/transaction dialog becomes a bottom sheet with safe-area padding.

The testnet banner stays at the top while scrolling. Root scroll padding reserves 48px. Hash navigation focuses the main landmark without moving the viewport away from the page start. The skip link focuses main and preserves the current route.

Chromium was rendered at 320, 390, 768 and 1440px. The 390px first screen visibly contains UNLOCK, the product explanation, the Trade UNLK action and the connect control. No horizontal overflow was found in the 28 route/width combinations. These observations do not establish native iPhone behavior or browser zoom coverage.

## Elevation & depth

Most surfaces are flat. Rules separate ledger/table rows; warm paper distinguishes the trade form and an editorial explanation. There are no decorative glows or gradients. Only transient transaction/connection notices use a shadow (`0 12px 44px #0005`). Native dialogs use a dark translucent backdrop and the browser top layer. No nested card-wall composition is used.

## Shapes

Controls use a 6px radius, segmented selections 4px, the trade surface 10px and the dialog 12px. The phone dialog has 16px upper corners. Achieved milestone markers are circular. `Emblem` in `components.tsx` draws the custom diamond as open SVG geometry, with one cyan facet edge. `favicon.svg` and `share.svg`/`share.png` reuse that geometry. These are local assets.

## Components

- `Button` styling (`.button`, `.primary`, `.compact`, `.full`) distinguishes the main action from supporting actions. Rest, hover, pressed, disabled and keyboard-focus states are defined. Controls normally have 44–48px minimum height.
- `PageHeading`, `Stat`, `SectionLink`, `Notice`, `DataStamp`, `AddressLink`, `Amount` and `Emblem` in `components.tsx` provide the shared page vocabulary. Invalid values say Unavailable, never a fabricated zero.
- `Modal`, `WalletProvider` and `ConnectButton` in `wallet.tsx` use a native dialog for focus containment, Escape, backdrop dismissal and native focus restoration. EIP-6963 wallets use their own marks; the SDK is loaded only for Coinbase use/restoration. Connection and transaction state are separate.
- `Trade` uses a warm form, explicit Buy/Sell buttons, labeled decimal input, slippage selection, simulation status and exact transaction review. The active trader, input, fees, minimum receipt, deadline and gas belong to the action rather than decorative market cards.
- `Withdrawal` distinguishes router credit from wallet ETH. `Rewards` presents native claim, evidence attestation and credit synchronization as separately recoverable steps, with native deduplication states and actual certification controls.
- `OraclePanel` separates achieved rights, valid FDV and pending confirmation. Progress text explains stale observations, invalid feeds, gaps and valid updates; a timer never implies automatic unlock.
- `Milestones` keeps W/E/S fixed during scenario changes. Achieved selections retain current rights; final unlock uses W. A worked example makes the cumulative ledger concrete.
- `PriceChart` places only valid covered Swap prices at their real event timestamps, with a single observed point when history has one trade. `Activity` uses current balances and block-stamped indexed events, search, event filtering and ten-row pagination. Mobile rows repeat their column labels visibly; visually hidden table headers retain their column scopes for assistive technology. Infrastructure addresses are labeled; an address count is not a people count.

Loading does not fabricate numbers. Matching-wallet balances and reward panels remain in place during block refreshes; account changes invalidate their data. Errors appear beside the relevant control, with retry or review paths. Transactions use an explicit review, another simulation/gas estimate, wallet signing, receipt status and manual recovery. No action automatically resends.

Motion is limited to 150ms named-property hover transitions and a 0.96 press scale, only under `prefers-reduced-motion: no-preference`. No entrance animation, parallax or continuous motion is implemented. Forced-colors rules preserve control boundaries and meaningful progress indications.

## Do’s and don’ts

Start a new public page with `PageHeading`, the existing main container and shared data context. Use `Notice` for unavailable/partial data, and put the block/time near any live numbers. Reuse `WalletProvider.review` for every explicit write. Keep one filled main action in a view.

Keep exact BigInt arithmetic separate from presentation. Keep the native ETH sentinel distinct from recipient addresses. Preserve the separate native-credit withdrawal and reward steps. Never label wallet tokens as escrowed/locked, turn an invalid oracle read into zero, add illustrative history to a real-data chart, or describe local tests as a public transaction/audit.

Design guidance and documentation-method attribution are retained in `web/NOTICE.md` and `web/licenses/design-guidance.txt`. This document describes the implemented source; remaining verification limits are in the validation record.
