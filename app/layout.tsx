// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "AIONYX Prediction — Bull Finder",
  description: "Telemetry-grade bull/bear detection with live market signals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bgGrid" />
        <div className="scanlines" />
        <div className="halo" />
        <header className="topbar">
          <div className="brand">
            <div className="logoMark" />
            <div className="brandText">
              <div className="brandTitle">AIONYX Prediction</div>
              <div className="brandSub">Bull Finder • Telemetry Console</div>
            </div>
          </div>

          <div className="topRight">
            <span className="pill">LIVE</span>
            <span className="pill ghost">No installs • Phone-safe</span>
          </div>
        </header>

        <main className="shell">{children}</main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} AIONYX</span>
          <span className="dot">•</span>
          <span>Signals are informational — not financial advice.</span>
        </footer>
      </body>
    </html>
  );
}
