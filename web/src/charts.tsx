import { useData } from "./data";
import { number, spotEth, date } from "./math";
export function PriceChart() {
  const d = useData();
  const trades = d.index?.events.filter((e) => e.kind === "Swap") ?? [];
  const data = trades.slice(-120).flatMap((e) => {
    const price = e.sqrt === undefined ? null : spotEth(e.sqrt);
    return price !== null && price > 0n
      ? [{ e, p: Number(price) / 1e18 }]
      : [];
  });
  const width = 700,
    height = 240,
    pad = 24;
  const prices = data.map((x) => x.p);
  const lo = prices.length ? Math.min(...prices) * 0.98 : 0;
  const hi = prices.length ? Math.max(...prices) * 1.02 : 1;
  const timeSpan = data.length > 1 ? data.at(-1)!.e.time - data[0].e.time : 0n;
  const point = (i: number) => [
    pad +
      (timeSpan === 0n
        ? 0.5
        : Number(data[i].e.time - data[0].e.time) / Number(timeSpan)) *
        (width - 2 * pad),
    height - pad - ((data[i].p - lo) / (hi - lo || 1)) * (height - 2 * pad),
  ];
  const path = data
    .map((_, i) => `${i ? "L" : "M"}${point(i).join(",")}`)
    .join(" ");
  const volume = trades.reduce(
    (sum, t) => sum + (t.amount0! < 0n ? -t.amount0! : t.amount0!),
    0n,
  );
  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <span>Recorded pool prices</span>
        <span className="small muted">ETH / UNLK · swap events</span>
      </div>
      {!data.length ? (
        <div className="chart-empty">
          <span className="chart-mark" aria-hidden="true">
            ◇
          </span>
          <p>
            {d.historyLoading
              ? "Reading covered swap events…"
              : d.historyError
                ? "Price history unavailable"
                : "No valid swap prices in the covered history"}
          </p>
          <p className="small muted">
            A chart appears only when verified pool events are available.
          </p>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="price-chart"
            role="img"
            aria-label={`Spot price after ${data.length} recorded ${data.length === 1 ? "swap" : "swaps"}. Latest ${prices.at(-1)?.toPrecision(5)} test ETH per UNLK.`}
          >
            {[0.25, 0.5, 0.75].map((x) => (
              <line
                key={x}
                x1={pad}
                x2={width - pad}
                y1={height * x}
                y2={height * x}
                stroke="var(--line)"
              />
            ))}
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
            {data.map((_, i) => (
              <circle
                key={i}
                cx={point(i)[0]}
                cy={point(i)[1]}
                r={data.length > 30 ? 2 : 4}
                fill="var(--accent)"
              >
                <title>
                  {date(data[i].e.time)} · {data[i].p.toPrecision(6)} test ETH /
                  UNLK
                </title>
              </circle>
            ))}
          </svg>
          <div className="chart-axis small muted">
            <span>{date(data[0].e.time)}</span>
            <span>
              {data.length > 1
                ? date(data.at(-1)!.e.time)
                : "One observed trade; no trend inferred"}
            </span>
          </div>
          <p className="small muted">
            Lines join recorded observations; no price is asserted between
            trades. Covered volume: {number(volume, 8)} test ETH across{" "}
            {trades.length} {trades.length === 1 ? "swap" : "swaps"}.
          </p>
        </>
      )}
      {d.index && (
        <p className="small muted">
          {d.index.complete ? "Covered" : "Partial history"}: blocks{" "}
          {d.index.from.toString()}–{d.index.to.toString()}, two-block delay.{" "}
          {trades.length > 120 ? "Showing the latest 120 events." : ""}
        </p>
      )}
    </div>
  );
}
