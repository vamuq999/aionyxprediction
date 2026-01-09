export default function Page() {
  return (
    <section className="w-full max-w-3xl">
      <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900 via-black to-slate-950 p-8 shadow-[0_0_60px_rgba(0,140,255,0.15)]">

        {/* Glow frame */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-blue-500/40 neon-ring" />

        <div className="space-y-6 relative z-10">
          <h2 className="text-3xl font-bold tracking-tight text-blue-400 neon-text">
            Market Bias: <span className="text-blue-300">NEUTRAL → BULLISH</span>
          </h2>

          <p className="text-slate-300 leading-relaxed">
            AIONYX is observing live volatility clusters and historical momentum.
            This is not hype. This is **probabilistic pressure**.
          </p>

          {/* Signal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SignalCard label="Confidence" value="72%" />
            <SignalCard label="Volatility" value="Moderate" />
            <SignalCard label="Momentum" value="Rising" />
          </div>

          {/* CTA */}
          <div className="pt-4 flex justify-end">
            <button className="px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/40 text-blue-300 font-medium tracking-wide hover:bg-blue-500/20 transition shadow-[0_0_20px_rgba(0,140,255,0.3)]">
              Refresh Signal
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-black/60 p-4 text-center shadow-[inset_0_0_20px_rgba(0,140,255,0.1)]">
      <div className="text-xs uppercase tracking-widest text-blue-400/70">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-blue-300 neon-text">
        {value}
      </div>
    </div>
  );
}
