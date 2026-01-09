"use client";

import { useEffect, useState } from "react";

type Signal = {
  asset: string;
  direction: "LONG" | "SHORT";
  confidence: number;
  price: string;
};

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    // Mock living signal feed (swap for API later)
    setSignals([
      { asset: "BTC", direction: "LONG", confidence: 78, price: "$42,180" },
      { asset: "ETH", direction: "LONG", confidence: 71, price: "$2,310" },
      { asset: "SOL", direction: "SHORT", confidence: 64, price: "$98.40" },
    ]);
  }, []);

  return (
    <section className="dashboard">
      <div className="hero">
        <h1>Predictive Signal Core</h1>
        <p>Adaptive intelligence reading probability, momentum, and bias.</p>
      </div>

      <div className="signal-grid">
        {signals.map((s, i) => (
          <div key={i} className="signal-card">
            <div className="signal-header">
              <span className="asset">{s.asset}</span>
              <span className={`direction ${s.direction.toLowerCase()}`}>
                {s.direction}
              </span>
            </div>

            <div className="price">{s.price}</div>

            <div className="confidence">
              <div
                className="confidence-bar"
                style={{ width: `${s.confidence}%` }}
              />
              <span>{s.confidence}% confidence</span>
            </div>
          </div>
        ))}
      </div>

      <div className="oracle-panel">
        <h2>Oracle Commentary</h2>
        <p>
          Market volatility compressing. Bias skewed bullish with asymmetric
          downside protection. Risk-on positioning advised with tight invalidation.
        </p>
      </div>
    </section>
  );
}
