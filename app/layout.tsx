// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIONYX Prediction — Bull Finder",
  description: "Telemetry bull finder with CoinGecko feeds + charts + confidence signals.",
  applicationName: "AIONYX Prediction",
  themeColor: "#061021",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" aria-hidden="true" />
        <div className="bg-glow" aria-hidden="true" />
        <header className="topbar">
          <div className="brand">
            <div className="logo">A</div>
            <div className="brandText">
              <div className="brandTitle">AIONYX Prediction</div>
              <div className="brandSub">Telemetry Bull Finder • Live Feeds • Confidence Engine</div>
            </div>
          </div>
          <div className="topbarRight">
            <span className="pill pill-blue">Steel Neon</span>
            <span className="pill">App Router</span>
          </div>
        </header>

        <main className="wrap">{children}</main>

        <footer className="footer">
          <span>Built with stubborn love + clean signals.</span>
          <span className="muted">Coin data: CoinGecko API</span>
        </footer>
      </body>
    </html>
  );
}
