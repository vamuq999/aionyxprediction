import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIONYX — Predictive Intelligence",
  description: "Living predictive intelligence engine. Markets, signals, futures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" />
        <div className="app-shell">
          <header className="app-header">
            <div className="logo">AIONYX</div>
            <nav className="nav">
              <span>Signals</span>
              <span>Markets</span>
              <span>Models</span>
            </nav>
          </header>

          <main className="app-main">{children}</main>

          <footer className="app-footer">
            <span>Living Intelligence Engine</span>
            <span className="pulse-dot" />
          </footer>
        </div>
      </body>
    </html>
  );
}
