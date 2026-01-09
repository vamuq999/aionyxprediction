"use client";

import { useState } from "react";

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function runPrediction() {
    setLoading(true);
    setResult("");

    try {
      // 1️⃣ Fetch REAL BTC price
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        { cache: "no-store" }
      );
      const priceData = await priceRes.json();
      const btcPrice = priceData.bitcoin.usd;

      // 2️⃣ Ask OpenAI to ANALYZE (not invent)
      const aiRes = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ btcPrice }),
      });

      const aiData = await aiRes.json();
      setResult(
        `BTC Price: $${btcPrice}\n\n` +
        `Bias: ${aiData.bias}\n` +
        `Confidence: ${aiData.confidence}%\n\n` +
        `${aiData.reasoning}`
      );
    } catch (err) {
      setResult("Error fetching prediction.");
    }

    setLoading(false);
  }

  return (
    <main className="container">
      <div className="card">
        <h1>AIONYX Prediction</h1>
        <div className="sub">
          AI-assisted market outlook · real price · zero hallucinations
        </div>

        <button onClick={runPrediction} disabled={loading}>
          {loading ? "Calculating…" : "Generate Prediction"}
        </button>

        {result && <div className="output">{result}</div>}
      </div>
    </main>
  );
}
