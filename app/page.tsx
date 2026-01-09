"use client";

import { useEffect, useState } from "react";

type PredictionResult = {
  prediction: number;
  confidence: number;
  state: "bullish" | "bearish" | "neutral";
  entropy: number;
  timestamp: number;
};

export default function HomePage() {
  const [data, setData] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchPrediction() {
    setLoading(true);

    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: {
          momentum: Math.random() * 2 - 1,
          trend: Math.random() * 2 - 1,
          volatility: Math.random(),
          sentiment: Math.random() * 2 - 1,
        },
      }),
    });

    const json = await res.json();
    setData(json.result);
    setLoading(false);
  }

  useEffect(() => {
    fetchPrediction();
    const id = setInterval(fetchPrediction, 15000); // living pulse
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card">
      <div className="halo" />

      <h1>AIONYX</h1>
      <p>Living Predictive Interface</p>

      {loading && <p>Calculating signal…</p>}

      {data && (
        <>
          <div className="stat">
            <span>State</span>
            <span>{data.state}</span>
          </div>

          <div className="stat">
            <span>Prediction</span>
            <span>{data.prediction}</span>
          </div>

          <div className="stat">
            <span>Confidence</span>
            <span>{Math.round(data.confidence * 100)}%</span>
          </div>

          <div className="stat">
            <span>Entropy</span>
            <span>{data.entropy}</span>
          </div>
        </>
      )}
    </div>
  );
}
