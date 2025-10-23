import HittersDeepDive from "@/components/HittersDeepDive";

export default function Page() {
  return (
    <div className="p-6">
      <div className="text-xs uppercase opacity-60">Scouting · Hitters</div>
      <h1 className="text-3xl font-semibold mt-1">Deep Dive</h1>
      <p className="opacity-60 mt-1">Filters, comps, pivots will be wired to live data.</p>
      <div className="mt-6">
        <HittersDeepDive />
      </div>
    </div>
  );
}
