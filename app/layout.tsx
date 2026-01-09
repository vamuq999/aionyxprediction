import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIONYX — Predictive Intelligence",
  description: "Steel-grade market signal. Neon precision.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-slate-100 antialiased">
        <div className="min-h-screen flex flex-col">
          {/* Top Bar */}
          <header className="border-b border-blue-500/20 bg-black/60 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold tracking-widest text-blue-400 neon-text">
                AIONYX
              </h1>
              <span className="text-xs text-blue-300/70 uppercase tracking-wider">
                Live Predictive Signal
              </span>
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 flex items-center justify-center px-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-blue-500/10 text-center py-4 text-xs text-blue-400/50">
            © {new Date().getFullYear()} Voltara Systems
          </footer>
        </div>
      </body>
    </html>
  );
}
