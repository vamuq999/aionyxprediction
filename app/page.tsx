"use client";

import React, { useEffect, useMemo, useState } from "react";

type CoinId = "bitcoin" | "ethereum" | "solana";
type Range = "1" | "7" | "30";
type SeriesPoint = { t: number; p: number };

function fmtUSD(n: number) {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtPct(n: number) {
  if (!isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function sma(values: number[], window: number) {
  if (values.length < window) return null;
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out.push(sum / window);
  }
  return out;
}

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function buildPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  return points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ");
}

function SparkChart({
  data,
  height = 220,
}: {
  data: SeriesPoint[];
  height?: number;
}) {
  const width = 900; // virtual width; scales via viewBox
  const pad = 18;

  const prices = data.map((d) => d.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1e-9, max - min);

  const pts = data.map((d, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1);
    const y = pad + ((max - d.p) * (height - pad * 2)) / span;
    return { x, y };
  });

  const dLine = buildPath(pts);
  const last = data.at(-1);
  const first = data.at(0);
  const up = (last?.p ?? 0) >= (first?.p ?? 0);

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Price chart">
        {/* Glow defs */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="fadeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={up ? "rgba(120,255,190,.35)" : "rgba(255,110,110,.28)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = pad + (i * (height - pad * 2)) / 5;
          return <line key={i} x1={pad} x2={width - pad} y1={y} y2={y} stroke="rgba(160,210,255,.10)" />;
        })}
        {Array.from({ length: 10 }).map((_, i) => {
          const x = pad + (i * (width - pad * 2)) / 9;
          return <line key={i} y1={pad} y2={height - pad} x1={x} x2={x} stroke="rgba(160,210,255,.06)" />;
        })}

        {/* Area fill */}
        {pts.length > 1 && (
          <path
            d={`${dLine} L ${pts.at(-1)!.x} ${height - pad} L ${pts[0].x} ${height - pad} Z`}
            fill="url(#fadeFill)"
          />
        )}

        {/* Main line (glow + crisp) */}
        <path d={dLine} fill="none" stroke="rgba(75,185,255,.55)" strokeWidth="6" filter="url(#glow)" />
        <path d={dLine} fill="none" stroke="rgba(180,235,255,.85)" strokeWidth="2.2" />

        {/* Last dot */}
        {pts.at(-1) && (
          <>
            <circle cx={pts.at(-1)!.x} cy={pts.at(-1)!.y} r="7" fill="rgba(75,185,255,.35)" filter="url(#glow)" />
            <circle cx={pts.at(-1)!.x} cy={pts.at(-1)!.y} r="3.2" fill="rgba(255,255,255,.85)" />
          </>
        )}
      </svg>
    </div>
  );
}

function computeSignal(series: SeriesPoint[]) {
  const prices = series.map((d) => d.p);
  const n = prices.length;
  const last = prices[n - 1] ?? 0;
  const prev = prices[n - 2] ?? last;

  const ret1 = ((last - prev) / Math.max(1e-9, prev)) * 100;

  // Trend: compare short/long SMA
  const shortW = Math.max(5, Math.floor(n * 0.12)); // scales with range
  const longW = Math.max(shortW + 4, Math.floor(n * 0.30));

  const sSMA = sma(prices, shortW);
  const lSMA = sma(prices, longW);

  const shortNow = sSMA ? sSMA[sSMA.length - 1] : last;
  const longNow = lSMA ? lSMA[lSMA.length - 1] : last;

  const trend = ((shortNow - longNow) / Math.max(1e-9, longNow)) * 100;

  // Momentum: slope over recent chunk
  const look = Math.max(6, Math.floor(n * 0.18));
  const start = prices[n - look] ?? prices[0] ?? last;
  const momentum = ((last - start) / Math.max(1e-9, start)) * 100;

  // Volatility: std dev of returns
  const rets: number[] = [];
  for (let i = 1; i < n; i++) {
    const a = prices[i - 1], b = prices[i];
    rets.push((b - a) / Math.max(1e-9, a));
  }
  const vol = stdev(rets) * 100; // %

  // Score: weighted
  const scoreRaw = trend * 1.2 + momentum * 0.9 + ret1 * 0.5 - vol * 0.6;
  const score = clamp(scoreRaw, -20, 20);

  // Confidence: higher with stronger score and lower volatility
  const conf = clamp((Math.abs(score) / 20) * 70 + clamp(18 - vol, 0, 18) * 1.7, 12, 92);

  let label: "BULL" | "BEAR" | "NEUTRAL" = "NEUTRAL";
  if (score > 3.2) label = "BULL";
  if (score < -3.2) label = "BEAR";

  const rationale = [
    `trend=${trend.toFixed(2)}%`,
    `momentum=${momentum.toFixed(2)}%`,
    `vol=${vol.toFixed(2)}%`,
    `score=${score.toFixed(2)}`,
  ].join(" • ");

  return { last, ret1, trend, momentum, vol, score, conf, label, rationale };
}

async function fetchMarket(coin: CoinId, days: Range) {
  const url =
    `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?` +
    new URLSearchParams({ vs_currency: "usd", days, interval: days === "1" ? "hourly" : "hourly" });

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const json = await res.json();

  const prices: [number, number][] = json?.prices ?? [];
  const series: SeriesPoint[] = prices.map(([t, p]) => ({ t, p }));
  return series;
}

export default function Page() {
  const [coin, setCoin] = useState<CoinId>("bitcoin");
  const [days, setDays] = useState<Range>("7");
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [oracleOn, setOracleOn] = useState(false);
  const [oracleText, setOracleText] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const s = await fetchMarket(coin, days);
        if (!alive) return;
        setSeries(s);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load market data.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [coin, days]);

  const sig = useMemo(() => (series.length ? computeSignal(series) : null), [series]);

  const badgeClass =
    sig?.label === "BULL" ? "good" : sig?.label === "BEAR" ? "bad" : "warn";

  async function runOracle() {
    if (!sig) return;
    setOracleText("");
    setOracleOn(true);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin,
          days,
          last: sig.last,
          signal: sig.label,
          confidence: sig.conf,
          metrics: { trend: sig.trend, momentum: sig.momentum, vol: sig.vol, score: sig.score, ret1: sig.ret1 },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Oracle error.");
      setOracleText(data?.text ?? "");
    } catch (e: any) {
      setOracleText(`Oracle offline: ${e?.message ?? "error"}`);
    }
  }

  return (
    <div className="grid">
      {/* LEFT: Telemetry */}
      <section className="card">
        <div className="cardHead">
          <div>
            <div className="cardTitle">Market Telemetry</div>
            <div className="cardSub">Live feed → chart → signal engine</div>
          </div>
          <div className="btnRow">
            <button className="btn secondary" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </div>
        </div>

        <div className="cardBody">
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="btn" onClick={() => setCoin("bitcoin")} aria-pressed={coin === "bitcoin"}>
              BTC
            </button>
            <button className="btn" onClick={() => setCoin("ethereum")} aria-pressed={coin === "ethereum"}>
              ETH
            </button>
            <button className="btn" onClick={() => setCoin("solana")} aria-pressed={coin === "solana"}>
              SOL
            </button>

            <span style={{ flex: "1 1 auto" }} />

            <button className="btn secondary" onClick={() => setDays("1")} aria-pressed={days === "1"}>
              24H
            </button>
            <button className="btn secondary" onClick={() => setDays("7")} aria-pressed={days === "7"}>
              7D
            </button>
            <button className="btn secondary" onClick={() => setDays("30")} aria-pressed={days === "30"}>
              30D
            </button>
          </div>

          {err && <div className="signal"><span className="badge bad" />{err}</div>}

          <div className="card" style={{ padding: 12, borderRadius: 18, border: "1px solid rgba(160,210,255,.10)" }}>
            {loading ? (
              <div className="small">Loading feed…</div>
            ) : series.length ? (
              <SparkChart data={series} />
            ) : (
              <div className="small">No data yet.</div>
            )}
          </div>

          <div className="hr" />

          <div className="row">
            <div className="kpi">
              <div className="kpiLabel">Last Price</div>
              <div className="kpiValue">{sig ? fmtUSD(sig.last) : "—"}</div>
              <div className="kpiHint">Source: CoinGecko</div>
            </div>

            <div className="kpi">
              <div className="kpiLabel">1-Step Move</div>
              <div className="kpiValue">{sig ? fmtPct(sig.ret1) : "—"}</div>
              <div className="kpiHint">Latest interval change</div>
            </div>

            <div className="kpi">
              <div className="kpiLabel">Volatility</div>
              <div className="kpiValue">{sig ? `${sig.vol.toFixed(2)}%` : "—"}</div>
              <div className="kpiHint">Std dev of returns</div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div className="kpi">
              <div className="kpiLabel">Trend</div>
              <div className="kpiValue">{sig ? fmtPct(sig.trend) : "—"}</div>
              <div className="kpiHint">Short SMA vs long SMA</div>
            </div>

            <div className="kpi">
              <div className="kpiLabel">Momentum</div>
              <div className="kpiValue">{sig ? fmtPct(sig.momentum) : "—"}</div>
              <div className="kpiHint">Slope over recent window</div>
            </div>

            <div className="kpi">
              <div className="kpiLabel">Signal Score</div>
              <div className="kpiValue">{sig ? sig.score.toFixed(2) : "—"}</div>
              <div className="kpiHint">Weighted blend</div>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT: Bull Finder */}
      <aside className="card">
        <div className="cardHead">
          <div>
            <div className="cardTitle">Bull Finder</div>
            <div className="cardSub">Decision + confidence + rationale</div>
          </div>
          <div className="btnRow">
            <button className="btn" disabled={!sig || loading} onClick={runOracle}>
              Run Oracle
            </button>
          </div>
        </div>

        <div className="cardBody">
          <div className="signal" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={`badge ${badgeClass}`} />
              <span style={{ fontWeight: 900 }}>
                {sig ? sig.label : loading ? "ANALYZING" : "IDLE"}
              </span>
            </div>
            <span>{sig ? `${Math.round(sig.conf)}%` : "—"}</span>
          </div>

          <div className="hr" />

          <div className="small">
            {sig ? (
              <>
                <div style={{ marginBottom: 8 }}>Rationale:</div>
                <div style={{ opacity: 0.95 }}>{sig.rationale}</div>
              </>
            ) : (
              "Load a market feed to compute a signal."
            )}
          </div>

          <div className="hr" />

          <div className="small" style={{ marginBottom: 8 }}>
            Oracle Commentary (optional):
          </div>

          <textarea
            value={
              oracleOn
                ? oracleText || "Summoning the oracle…"
                : "Tip: Set OPENAI_API_KEY (Vercel env) to enable oracle commentary.\nOtherwise the Bull Finder still works 100%."
            }
            readOnly
          />

          <div className="hr" />

          <div className="btnRow">
            <button className="btn secondary" onClick={() => { setOracleOn(false); setOracleText(""); }}>
              Clear
            </button>
            <button
              className="btn secondary"
              onClick={() => {
                const text = sig
                  ? `AIONYX ${coin.toUpperCase()} ${days}D → ${sig.label} @ ${Math.round(sig.conf)}% | ${sig.rationale}`
                  : "AIONYX Prediction";
                navigator.clipboard?.writeText(text);
              }}
            >
              Copy Signal
            </button>
          </div>

          <div style={{ marginTop: 10 }} className="small">
            If CoinGecko rate-limits you, switch coin/range and refresh. This is a lightweight “ship it” build.
          </div>
        </div>
      </aside>
    </div>
  );
}
