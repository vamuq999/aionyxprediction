"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
};

type ChartPoint = { t: number; p: number };

const DEFAULT_IDS = ["bitcoin", "ethereum", "solana", "dogecoin"] as const;
const ID_LABEL: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
  dogecoin: "Dogecoin",
};

function fmtUSD(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 6 : 2 });
}
function fmtCompact(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 });
}
function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

async function fetchCG(path: string) {
  const base = "https://api.coingecko.com/api/v3";
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY?.trim();

  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(apiKey ? { "x-cg-demo-api-key": apiKey } : {}),
    },
    // prevent Next caching shenanigans for live telemetry
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoinGecko ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/** --- Signal Math (lightweight, no libraries) --- **/
function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  let e = values[0] ?? 0;
  const out: number[] = [e];
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses += -d;
  }
  gains /= period;
  losses /= period;
  let rs = losses === 0 ? 100 : gains / losses;
  let r = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gains = (gains * (period - 1) + g) / period;
    losses = (losses * (period - 1) + l) / period;
    rs = losses === 0 ? 100 : gains / losses;
    r = 100 - 100 / (1 + rs);
  }
  return clamp(r, 0, 100);
}

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

function buildSignal(points: ChartPoint[]) {
  const prices = points.map((x) => x.p);
  const last = prices[prices.length - 1] ?? 0;
  const first = prices[0] ?? last;
  const ret = first ? (last - first) / first : 0;

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macd = ema12.map((v, i) => v - (ema26[i] ?? v));
  const signal = ema(macd, 9);
  const hist = macd[macd.length - 1] - (signal[signal.length - 1] ?? 0);

  const r = rsi(prices, 14);

  // Volatility on log returns
  const rets: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const a = prices[i - 1];
    const b = prices[i];
    if (a > 0 && b > 0) rets.push(Math.log(b / a));
  }
  const vol = stdev(rets);

  // Momentum (last 20% vs first 20%)
  const n = prices.length;
  const k = Math.max(5, Math.floor(n * 0.2));
  const early = prices.slice(0, k);
  const late = prices.slice(n - k);
  const earlyMean = early.reduce((a, b) => a + b, 0) / early.length;
  const lateMean = late.reduce((a, b) => a + b, 0) / late.length;
  const mom = earlyMean ? (lateMean - earlyMean) / earlyMean : 0;

  // Composite score -> confidence
  // Weighted “tell it like it is”: trend + momentum + macd-hist - volatility penalty + RSI zone bonus
  const trendScore = clamp(ret * 5, -1.5, 1.5);       // 7d-ish return scaled
  const momScore = clamp(mom * 6, -1.5, 1.5);
  const macdScore = clamp(hist * 10, -1.5, 1.5);
  const volPenalty = clamp(vol * 8, 0, 1.2);          // higher vol reduces confidence
  const rsiBias = r > 55 ? 0.35 : r < 45 ? -0.35 : 0;

  const raw = trendScore + momScore + macdScore + rsiBias - volPenalty;
  const score = clamp(raw, -3, 3);

  const confidence = clamp(Math.abs(score) / 3, 0, 1);

  const label =
    score > 0.55 ? "BULLISH" :
    score < -0.55 ? "BEARISH" :
    "NEUTRAL";

  const color =
    label === "BULLISH" ? "good" :
    label === "BEARISH" ? "bad" :
    "";

  return {
    label,
    color,
    score,
    confidence,
    rsi: r,
    volatility: vol,
    trend: ret,
    momentum: mom,
    macdHist: hist,
    last,
  };
}

/** --- Tiny SVG charts (no deps) --- **/
function Sparkline({ data }: { data: number[] }) {
  const w = 120, h = 34, pad = 3;
  if (!data.length) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1 || 1);
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });

  const d = `M ${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L ")}`;
  const up = data[data.length - 1] >= data[0];

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="sparkline">
      <path d={d} fill="none" stroke={up ? "rgba(39,242,176,.9)" : "rgba(255,92,138,.9)"} strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`}
        fill={up ? "rgba(39,242,176,.12)" : "rgba(255,92,138,.12)"} stroke="none"
      />
    </svg>
  );
}

function LineChart({
  points,
  height = 260,
}: {
  points: ChartPoint[];
  height?: number;
}) {
  const w = 1000;
  const h = height;
  const pad = 20;

  if (!points.length) {
    return (
      <div className="alert">
        No chart data yet. If you’re seeing 401, add your CoinGecko Demo API key to{" "}
        <span className="mono">NEXT_PUBLIC_COINGECKO_API_KEY</span>.
      </div>
    );
  }

  const ys = points.map((p) => p.p);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;

  const pts = points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / (points.length - 1 || 1);
    const y = pad + (h - pad * 2) * (1 - (p.p - min) / span);
    return [x, y] as const;
  });

  const d = `M ${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L ")}`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((k) => {
        const y = pad + (h - pad * 2) * k;
        return <line key={k} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(115,170,255,.10)" />;
      })}
      <path d={d} fill="none" stroke="rgba(99,179,255,.95)" strokeWidth="2.6" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="rgba(99,179,255,.12)" />
      {/* last point */}
      <circle cx={last[0]} cy={last[1]} r="5" fill="rgba(191,232,255,.95)" />
      <circle cx={last[0]} cy={last[1]} r="12" fill="rgba(99,179,255,.12)" />
    </svg>
  );
}

export default function Page() {
  const [activeId, setActiveId] = useState<string>("bitcoin");
  const [status, setStatus] = useState<"BOOTING" | "LIVE" | "DEGRADED">("BOOTING");
  const [statusMsg, setStatusMsg] = useState<string>("Initializing telemetry…");
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [errorText, setErrorText] = useState<string>("");

  const timerRef = useRef<number | null>(null);

  const signal = useMemo(() => buildSignal(chart), [chart]);

  async function loadAll() {
    setErrorText("");
    try {
      // 1) ping
      const ping = await fetchCG("/ping");
      const ok = typeof ping?.gecko_says === "string";

      // 2) markets (live feed)
      const ids = DEFAULT_IDS.join("%2C");
      const m: MarketRow[] = await fetchCG(
        `/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
      );

      // 3) chart for active coin (7 days)
      const days = 7;
      const c = await fetchCG(`/coins/${activeId}/market_chart?vs_currency=usd&days=${days}`);
      const pts: ChartPoint[] = (c?.prices ?? []).map((pair: [number, number]) => ({ t: pair[0], p: pair[1] }));

      // 4) sparklines (lightweight: downsample from chart endpoint per coin)
      // Keep it modest to avoid rate limit drama.
      const sparkObj: Record<string, number[]> = {};
      for (const id of DEFAULT_IDS) {
        // pull only if missing or older
        if (!sparks[id] || sparks[id].length < 10 || id === activeId) {
          const sc = await fetchCG(`/coins/${id}/market_chart?vs_currency=usd&days=1`);
          const arr: number[] = (sc?.prices ?? []).map((x: [number, number]) => x[1]);
          // downsample to ~40 points
          const step = Math.max(1, Math.floor(arr.length / 40));
          sparkObj[id] = arr.filter((_, idx) => idx % step === 0);
        } else {
          sparkObj[id] = sparks[id];
        }
      }

      setMarkets(m);
      setChart(pts);
      setSparks((prev) => ({ ...prev, ...sparkObj }));
      setLastRefresh(Date.now());

      if (ok) {
        setStatus("LIVE");
        setStatusMsg(ping.gecko_says);
      } else {
        setStatus("DEGRADED");
        setStatusMsg("Ping responded but looked weird — feeds still flowing.");
      }
    } catch (e: any) {
      setStatus("DEGRADED");
      setStatusMsg("Feed interrupted.");
      setErrorText(e?.message || String(e));
    }
  }

  useEffect(() => {
    // boot
    loadAll();

    // refresh cadence: keep it respectful (CoinGecko public/demo limits are real) 1
    // 30s is usually okay for a small dashboard with a key; if you still hit limits, bump to 60s.
    timerRef.current = window.setInterval(() => loadAll(), 30_000) as unknown as number;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const badge = (
    <span className="badge">
      <span className={`dot ${status === "LIVE" ? "good" : status === "DEGRADED" ? "bad" : ""}`} />
      {status}
    </span>
  );

  return (
    <div className="grid">
      {/* LEFT: Main Chart + Signal */}
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Bull Finder • {ID_LABEL[activeId] ?? activeId}</div>
            <div className="cardMeta">
              Live CoinGecko feeds • last refresh{" "}
              <span className="mono">{new Date(lastRefresh).toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="row">
            {badge}
            <select className="select" value={activeId} onChange={(e) => setActiveId(e.target.value)}>
              {DEFAULT_IDS.map((id) => (
                <option key={id} value={id}>
                  {ID_LABEL[id]}
                </option>
              ))}
            </select>
            <button className="btn" onClick={() => loadAll()}>
              Force Refresh
            </button>
          </div>
        </div>

        <div className="cardBody">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row">
              <span className="pill pill-blue">Signal: {signal.label}</span>
              <span className="pill">
                Confidence: {(signal.confidence * 100).toFixed(0)}%
              </span>
              <span className="pill">RSI: {signal.rsi.toFixed(1)}</span>
              <span className="pill">Trend: {(signal.trend * 100).toFixed(2)}%</span>
            </div>
            <div className="muted">
              Ping: <span className="mono">{statusMsg}</span>
            </div>
          </div>

          <div className="space" />
          {errorText ? (
            <div className="alert">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Telemetry Warning</div>
              <div className="mono" style={{ whiteSpace: "pre-wrap" }}>
                {errorText}
              </div>
              <div className="hr" />
              <div>
                Fix: set <span className="mono">NEXT_PUBLIC_COINGECKO_API_KEY</span> to your **CoinGecko Demo API key**.
                CoinGecko recommends supplying it in headers as <span className="mono">x-cg-demo-api-key</span>. 2
              </div>
            </div>
          ) : (
            <LineChart points={chart} />
          )}

          <div className="hr" />

          <div className="kpiGrid">
            <div className="kpi">
              <div className="kpiLabel">Last Price</div>
              <div className="kpiVal">{fmtUSD(signal.last)}</div>
              <div className="kpiHint">Latest point in chart feed</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">Momentum</div>
              <div className="kpiVal">{(signal.momentum * 100).toFixed(2)}%</div>
              <div className="kpiHint">Late vs early mean</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">MACD Histogram</div>
              <div className="kpiVal">{signal.macdHist.toFixed(4)}</div>
              <div className="kpiHint">Acceleration vs baseline</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">Volatility</div>
              <div className="kpiVal">{signal.volatility.toFixed(4)}</div>
              <div className="kpiHint">Log-return std dev</div>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT: Live Feed Table */}
      <aside className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Live Feed • Market Snapshot</div>
            <div className="cardMeta">Top coins (sample) • 24h change • mini-sparks</div>
          </div>
          <button className="btn btnGhost" onClick={() => setActiveId("bitcoin")}>
            Reset
          </button>
        </div>

        <div className="cardBody">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Price</th>
                <th>24h</th>
                <th>Spark</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => {
                const change = m.price_change_percentage_24h;
                const isUp = (change ?? 0) >= 0;
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={m.name}
                          src={m.image}
                          width={22}
                          height={22}
                          style={{ borderRadius: 999 }}
                        />
                        <div>
                          <strong style={{ display: "block" }}>{m.name}</strong>
                          <span className="muted mono">{m.symbol.toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{fmtUSD(m.current_price)}</td>
                    <td className="mono" style={{ color: isUp ? "rgba(39,242,176,.95)" : "rgba(255,92,138,.95)" }}>
                      {(change ?? 0).toFixed(2)}%
                    </td>
                    <td>
                      <Sparkline data={sparks[m.id] ?? []} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="hr" />

          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted">
              Market Cap (active):{" "}
              <span className="mono">
                {fmtCompact(markets.find((x) => x.id === activeId)?.market_cap ?? NaN)}
              </span>
            </div>
            <div className="muted">
              Volume:{" "}
              <span className="mono">
                {fmtCompact(markets.find((x) => x.id === activeId)?.total_volume ?? NaN)}
              </span>
            </div>
          </div>

          <div className="space" />

          <div className="alert">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Deployment Note (no sugar-coating)</div>
            <div>
              This uses <span className="mono">NEXT_PUBLIC_COINGECKO_API_KEY</span> (client-visible).
              That’s fine for a demo, but for “serious operator mode,” move CoinGecko calls into a Next API route
              so the key stays server-side.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
