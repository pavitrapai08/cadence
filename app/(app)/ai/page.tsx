import { DigestStream } from "@/components/ai/DigestStream";
import { HealthCheck } from "@/components/ai/HealthCheck";

export default function AiPage() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div
          className="relative overflow-hidden px-4 py-10 md:px-8 md:py-12"
          style={{ background: "linear-gradient(135deg, #071a10 0%, #0d2b1c 40%, #0a1e3a 100%)" }}
        >
          <div className="hero-orb-a pointer-events-none absolute right-[12%] top-[-50%] h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.40) 0%, transparent 70%)" }} />
          <div className="hero-orb-b pointer-events-none absolute right-[-3%] bottom-[-65%] h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.30) 0%, transparent 70%)" }} />
          <div className="hero-orb-c pointer-events-none absolute left-[55%] top-[-25%] h-52 w-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.34) 0%, transparent 70%)" }} />
          <div className="hero-orb-d pointer-events-none absolute left-[38%] bottom-[-45%] h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(20,184,166,0.28) 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Insights</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(167,243,208,0.75)" }}>
              Your weekly digest and timesheet health check
            </p>
          </div>
        </div>
      </div>

      {/* Two-card grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DigestStream />
        <HealthCheck />
      </div>
    </div>
  );
}
