"use client";

import { useEffect, useState } from "react";

type Result = {
  prediction: number;
  confidence: number;
  state: string;
};

export default function Page() {
  const [data, setData] = useState<Result | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            features: {
              momentum: 0.3,
              trend: 0.2,
              volatility: 0.4,
              sentiment: 0.1,
            },
          }),
        });

        if (!res.ok) throw new Error("API failed");

        const json = await res.json();
        setData(json.result);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    load();
  }, []);

  return (
    <div className="card">
      <div className="orb" />

      <h1>AIONYX</h1>
      <p>Living Predictive Interface</p>

      {status === "loading" && <p>Calculating signal…</p>}

      {status === "error" && (
        <p style={{ color: "#ff6b6b" }}>
          Signal offline — API not responding
        </p>
      )}

      {status === "ready" && data && (
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
        </>
      )}
    </div>
  );
}
