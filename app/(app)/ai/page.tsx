import { DigestStream } from "@/components/ai/DigestStream";
import { HealthCheck } from "@/components/ai/HealthCheck";

export default function AiPage() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-[#F8FAFB] px-4 py-7 md:px-6">
          <div className="pointer-events-none absolute right-12 top-3 h-12 w-12 rounded-full bg-emerald-100/40" />
          <div className="pointer-events-none absolute right-28 top-6 h-5 w-5 rounded-full bg-teal-100/50" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">AI Insights</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your weekly digest and timesheet health check
          </p>
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
