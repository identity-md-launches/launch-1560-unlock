import { useEffect, useRef, useState } from "react";
import { type Address } from "viem";
import { useData } from "./data";
import { useWallet, errorMessage } from "./wallet";
import { abi, addresses as a, client, explorer } from "./config";
import { Amount, Notice, PageHeading, DataStamp } from "./components";
import { exact, minReceipt, number, parseAmount, swapStep, usd } from "./math";
import { PriceChart } from "./charts";
interface SwapRequest {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
  maxInput: bigint;
  minOutput: bigint;
  deadline: bigint;
}
interface Quote {
  request: SwapRequest;
  input: bigint;
  output: bigint;
  fee: bigint;
  gas: bigint;
  gasPrice: bigint;
  block: bigint;
  time: number;
  account: Address;
  buy: boolean;
  amountText: string;
  slippage: string;
}
export function Trade() {
  const d = useData();
  const w = useWallet();
  const s = d.snapshot;
  const [buy, setBuy] = useState(true);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("50");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [, tick] = useState(0);
  const generation = useRef(0);
  const formRef = useRef({ buy, amount, slippage, address: w.address });
  formRef.current = { buy, amount, slippage, address: w.address };
  useEffect(() => {
    generation.current++;
    setQuote(null);
    setQuoting(false);
    setError("");
  }, [buy, amount, slippage, w.address, w.network, w.receiptVersion]);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  let parsed: bigint | null = null;
  try {
    parsed = parseAmount(amount);
  } catch {
    /* validate on submit */
  }
  const needsApproval =
    !buy && parsed !== null && !!d.wallet && d.wallet.approval < parsed;
  const stale =
    !!quote &&
    (Date.now() - quote.time > 45000 ||
      (!!s && s.block > quote.block + 2n) ||
      quote.account !== w.address ||
      quote.request.deadline < BigInt(Math.floor(Date.now() / 1000)));
  const walletReady =
    !!w.address &&
    w.network === 11155111 &&
    !!d.wallet &&
    !!s &&
    d.wallet.block === s.block &&
    !d.error &&
    Date.now() - s.fetchedAt < 60000;
  function validateInput() {
    if (!s || d.error || Date.now() - s.fetchedAt > 60000)
      throw Error(
        "Fresh verified pool data is required. Refresh and try again.",
      );
    if (!w.address || !d.wallet)
      throw Error("Connect your wallet and wait for its balance to load.");
    if (w.network !== 11155111) throw Error("Switch your wallet to Sepolia.");
    const n = parseAmount(amount);
    if (buy && n >= d.wallet.native)
      throw Error("Leave enough test ETH in your wallet for gas.");
    if (!buy && n > d.wallet.within)
      throw Error("Enter an amount within your current sell allowance.");
    if (s.protocolFee !== 0 || s.lpFee !== 12500)
      throw Error("The pool fee configuration prevents official trades.");
    return n;
  }
  async function getQuote() {
    if (!w.address) {
      w.open();
      return;
    }
    setError("");
    const gen = ++generation.current;
    setQuote(null);
    setQuoting(true);
    try {
      const n = validateInput();
      if (needsApproval)
        throw Error(
          "Approve the exact input amount first. A real sell simulation needs the router’s allowance.",
        );
      const request: SwapRequest = {
        zeroForOne: buy,
        amountSpecified: -n,
        sqrtPriceLimitX96: buy ? s!.lower : s!.upper,
        maxInput: n,
        minOutput: 1n,
        deadline: s!.timestamp + 300n,
      };
      const result = await client.simulateContract({
        address: a.router,
        abi: abi.router,
        functionName: "swap",
        args: [request],
        account: w.address,
        value: buy ? n : 0n,
        blockNumber: s!.block,
      });
      const [input, output] = result.result as [bigint, bigint];
      const math = swapStep(
        buy,
        n,
        s!.sqrt,
        buy ? s!.lower : s!.upper,
        s!.positionLiquidity,
      );
      if (math.input !== input || math.output !== output)
        throw Error(
          "The router result and exact fee calculation disagree. Refresh pool data before trying again.",
        );
      request.minOutput = minReceipt(output, BigInt(slippage));
      if (request.minOutput <= 0n)
        throw Error("The output is too small. Increase the amount.");
      const [gas, gasPrice] = await Promise.all([
        client.estimateContractGas({
          address: a.router,
          abi: abi.router,
          functionName: "swap",
          args: [request],
          account: w.address,
          value: buy ? n : 0n,
        }),
        client.getGasPrice(),
      ]);
      if (gen !== generation.current) return;
      setQuote({
        request,
        input,
        output,
        fee: math.fee,
        gas,
        gasPrice,
        block: s!.block,
        time: Date.now(),
        account: w.address,
        buy,
        amountText: amount,
        slippage,
      });
    } catch (e) {
      if (gen === generation.current) setError(errorMessage(e));
    } finally {
      if (gen === generation.current) setQuoting(false);
    }
  }
  async function approve() {
    try {
      const n = validateInput();
      await w.review({
        title: "Approve UNLK for this sale",
        description:
          "Allow only the bound UnlkSwapRouter to transfer this input amount. Approval does not execute a sale.",
        address: a.token,
        abi: abi.token,
        functionName: "approve",
        args: [a.router, n],
        details: [
          ["Spender", a.router],
          ["Approval amount", `${exact(n)} UNLK`],
        ],
        onSuccess: () => {
          setQuote(null);
          d.refresh();
        },
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function execute() {
    if (!quote || stale) return;
    const q = quote;
    await w.review({
      title: q.buy ? "Buy UNLK" : "Sell UNLK",
      description: q.buy
        ? "Spend test ETH through the official router. UNLK is delivered to this wallet. Any unspent ETH becomes withdrawable router credit."
        : "Sell UNLK through the official router. The ETH proceeds become your withdrawable router credit; withdraw them separately.",
      address: a.router,
      abi: abi.router,
      functionName: "swap",
      args: [q.request],
      value: q.buy ? q.request.maxInput : 0n,
      details: [
        [
          "Maximum input",
          `${exact(q.request.maxInput)} ${q.buy ? "test ETH" : "UNLK"}`,
        ],
        [
          "Expected receipt",
          `${exact(q.output)} ${q.buy ? "UNLK" : "test ETH credit"}`,
        ],
        [
          "Minimum receipt",
          `${exact(q.request.minOutput)} ${q.buy ? "UNLK" : "test ETH credit"}`,
        ],
        [
          "Trading fee included",
          `${exact(q.fee)} ${q.buy ? "test ETH" : "UNLK"}`,
        ],
        ["Slippage", `${Number(q.slippage) / 100}%`],
        [
          "Deadline",
          new Date(Number(q.request.deadline) * 1000).toLocaleTimeString(
            "en-GB",
            { timeZone: "UTC" },
          ) + " UTC",
        ],
      ],
      validate: async () => {
        const f = formRef.current;
        if (
          f.address !== q.account ||
          f.buy !== q.buy ||
          f.amount !== q.amountText ||
          f.slippage !== q.slippage
        )
          throw Error("Trade details changed. Request a new quote.");
        const latest = await client.getBlock();
        if (
          Date.now() - q.time > 45000 ||
          latest.number > q.block + 2n ||
          latest.timestamp >= q.request.deadline
        )
          throw Error("Quote expired. Request a fresh quote before signing.");
      },
      onSuccess: () => {
        setQuote(null);
        d.refresh();
      },
    });
  }
  return (
    <>
      <PageHeading title="Trade on your terms.">
        The official ETH / UNLK pool. Every quote is simulated for your wallet.
      </PageHeading>
      <div className="trade-layout">
        <section className="market-panel">
          <div className="market-title">
            <h2>
              UNLK <span className="muted">/ ETH</span>
            </h2>
            <span className="tag">Official pool</span>
          </div>
          <div className="market-price">
            <strong>
              {s?.spotUsd !== null && s?.spotUsd !== undefined
                ? `$${number(s.spotUsd, 8)}`
                : "USD unavailable"}
            </strong>
            <span className="muted">Indicative spot price per UNLK</span>
            <p className="small">
              {s?.spot != null
                ? `${number(s.spot, 12)} test ETH / UNLK`
                : "Reading pool price…"}
            </p>
          </div>
          <PriceChart />
          <div className="market-facts">
            <div>
              <span>Verified milestone FDV</span>
              <strong>{usd(s?.fdv)}</strong>
            </div>
            <div>
              <span>Current pool fee</span>
              <strong>{s ? `${s.lpFee / 10000}%` : "Reading…"}</strong>
            </div>
            <div>
              <span>Seed-position ETH principal</span>
              <Amount value={s?.poolEth} unit="test ETH" digits={8} />
            </div>
          </div>
          <p className="small muted">
            Spot is the current pool price, not a verified milestone. Pool
            amounts describe this seed position and exclude accrued fees. They
            are not PoolManager’s aggregate balances.
          </p>
        </section>
        <section className="swap-panel" aria-label="Swap form">
          <div className="segmented" aria-label="Trade direction">
            <button aria-pressed={buy} onClick={() => setBuy(true)}>
              Buy UNLK
            </button>
            <button aria-pressed={!buy} onClick={() => setBuy(false)}>
              Sell UNLK
            </button>
          </div>
          <div className="swap-input">
            <label htmlFor="trade-amount">You pay</label>
            <div className="amount-entry">
              <input
                id="trade-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="trade-error trade-balance"
                aria-invalid={!!error}
              />
              <span>{buy ? "ETH" : "UNLK"}</span>
            </div>
            <div id="trade-balance" className="small muted">
              {d.wallet ? (
                <>
                  {buy ? "Wallet balance: " : "Within your allowance: "}
                  <Amount
                    value={buy ? d.wallet.native : d.wallet.within}
                    unit={buy ? "test ETH" : "UNLK"}
                  />
                  {!buy && (
                    <button
                      className="text-button"
                      onClick={() => setAmount(exact(d.wallet!.within))}
                    >
                      Use allowance
                    </button>
                  )}
                </>
              ) : (
                "Connect to see your balance"
              )}
            </div>
          </div>
          <div className="swap-divider" aria-hidden="true">
            ↓
          </div>
          <div className="receive">
            <span>You receive{!buy ? " as router credit" : ""}</span>
            <strong>
              <Amount
                value={quote?.output}
                unit={buy ? "UNLK" : "test ETH"}
                digits={8}
              />
            </strong>
            <span className="small muted">
              {quote
                ? stale
                  ? "Quote expired. Refresh before signing."
                  : "Simulated output, fees included"
                : "Enter an amount for a simulated quote"}
            </span>
          </div>
          <label className="setting" htmlFor="slippage">
            Slippage tolerance
            <select
              id="slippage"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
            >
              <option value="10">0.1%</option>
              <option value="50">0.5%</option>
              <option value="100">1.0%</option>
              <option value="300">3.0%</option>
              <option value="500">5.0%</option>
            </select>
          </label>
          {needsApproval && (
            <Notice tone="warning">
              <p>A sell quote needs an on-chain approval first.</p>
              <p className="small">
                Spender:{" "}
                <a
                  className="address"
                  href={explorer(a.router)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.router}
                </a>
              </p>
              <p>
                Approval: <Amount value={parsed} digits={8} />. No sale is
                included.
              </p>
            </Notice>
          )}
          {quote && (
            <dl className="details quote-details">
              <div>
                <dt>Minimum receipt</dt>
                <dd>
                  <Amount
                    value={quote.request.minOutput}
                    unit={buy ? "UNLK" : "test ETH credit"}
                    digits={8}
                  />
                </dd>
              </div>
              <div>
                <dt>Actual input</dt>
                <dd>
                  <Amount
                    value={quote.input}
                    unit={buy ? "test ETH" : "UNLK"}
                    digits={8}
                  />
                </dd>
              </div>
              <div>
                <dt>Pool fee, included</dt>
                <dd>
                  <Amount
                    value={quote.fee}
                    unit={buy ? "test ETH" : "UNLK"}
                    digits={8}
                  />
                </dd>
              </div>
              <div>
                <dt>Estimated gas</dt>
                <dd>
                  ~
                  <Amount
                    value={quote.gas * quote.gasPrice}
                    unit="test ETH"
                    digits={8}
                  />
                </dd>
              </div>
              <div>
                <dt>Quote at block</dt>
                <dd>{quote.block.toString()}</dd>
              </div>
              <div>
                <dt>Valid for</dt>
                <dd>
                  {stale
                    ? "Expired"
                    : `${Math.max(0, 45 - Math.floor((Date.now() - quote.time) / 1000))} seconds, at most 2 new blocks`}
                </dd>
              </div>
            </dl>
          )}
          {quote && quote.input < quote.request.maxInput && (
            <Notice tone="warning">
              Partial fill: only{" "}
              <Amount
                value={quote.input}
                unit={buy ? "test ETH" : "UNLK"}
                digits={8}
              />{" "}
              is spent.{" "}
              {buy
                ? "Unused ETH is credited for withdrawal."
                : "Unspent UNLK returns to this wallet."}
            </Notice>
          )}
          <p id="trade-error" role="status" className="error">
            {error || d.walletError}
          </p>
          {!w.address ? (
            <button className="button primary full" onClick={w.open}>
              Connect to trade ↗
            </button>
          ) : w.network !== 11155111 ? (
            <button className="button primary full" onClick={w.switchNetwork}>
              Switch to Sepolia
            </button>
          ) : needsApproval ? (
            <button
              className="button primary full"
              disabled={!walletReady || w.busy}
              onClick={approve}
            >
              Review exact approval
            </button>
          ) : quote && !stale ? (
            <button
              className="button primary full"
              disabled={w.busy || !walletReady}
              onClick={execute}
            >
              Review {buy ? "buy" : "sell"} ↗
            </button>
          ) : (
            <button
              className="button primary full"
              disabled={quoting || w.busy || !walletReady}
              onClick={getQuote}
            >
              {quoting
                ? "Simulating your trade…"
                : stale
                  ? "Refresh quote"
                  : "Get a quote"}
            </button>
          )}
          {quote && !stale && (
            <button
              className="text-button full"
              disabled={quoting || w.busy}
              onClick={getQuote}
            >
              Refresh quote
            </button>
          )}
          <p className="small muted">
            1.25% pool fee: 1% payer + 0.25% IMD. No extra hook fee. Price
            limits stay within the seed range; exact-input trades may partially
            fill. Quotes expire; execution depends on liquidity and pending
            trades.
          </p>
        </section>
      </div>
      <DataStamp />
      <Withdrawal />
    </>
  );
}
export function Withdrawal() {
  const d = useData();
  const w = useWallet();
  const value = d.wallet?.credit;
  return (
    <section className="withdrawal">
      <div>
        <h2>ETH available to withdraw</h2>
        <p>
          Sales and unused buy funding settle as credit in the router. Withdraw
          to the same wallet in a separate transaction.
        </p>
      </div>
      <div>
        <strong>
          <Amount value={value} unit="test ETH" digits={8} />
        </strong>
        <button
          className="button"
          disabled={
            !w.address ||
            w.network !== 11155111 ||
            !value ||
            w.busy ||
            !!d.error
          }
          onClick={() =>
            w.review({
              title: "Withdraw native ETH",
              description:
                "Withdraw all of this wallet’s settled ETH credit from the router to this same wallet. This transaction also costs gas.",
              address: a.router,
              abi: abi.router,
              functionName: "withdrawNative",
              details: [
                ["Currently available", `${exact(value ?? 0n)} test ETH`],
              ],
              onSuccess: d.refresh,
            })
          }
        >
          Review withdrawal ↗
        </button>
      </div>
    </section>
  );
}
