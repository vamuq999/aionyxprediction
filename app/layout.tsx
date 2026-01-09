import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIONYX Prediction",
  description: "AI-assisted market outlook • real price • confidence scores",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" />
        <div className="app-shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark" />
              <div className="brand-text">
                <div className="brand-title">AIONYX</div>
                <div className="brand-sub">Corporate Tech • Predictive Intelligence</div>
              </div>
            </div>

            <div className="topbar-right">
              <span className="pill">Live</span>
              <span className="pill pill-muted">CoinGecko</span>
              <span className="pill pill-muted">OpenAI</span>
            </div>
          </header>

          <main className="content">{children}</main>

          <footer className="footer">
            <span>Not financial advice. For research/education.</span>
            <span className="dot">•</span>
            <span>Zero client-side keys. Server routes only.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
