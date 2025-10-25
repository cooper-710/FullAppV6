import { fetchPlayerSummary, splitNameFromId } from "@/lib/api";
import DeepDiveClient from "@/components/deep-dive/DeepDiveClient";

type Props = { params: { id: string }; searchParams: { season?: string; seasons?: string | string[] } };

export default async function Page({ params, searchParams }: Props) {
  const { id } = params;
  const { first, last } = splitNameFromId(id);
  const seasonsParam = searchParams.seasons ?? searchParams.season ?? "2025";
  const seasons = Array.isArray(seasonsParam) ? seasonsParam : String(seasonsParam).split(",");
  const summary = await fetchPlayerSummary(first, last, seasons);

  return (
    <div className="px-6 py-4 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Deep Dive — {summary?.meta?.player ?? `${first} ${last}`} ({seasons.join(", ")})
        </h1>
        <p className="text-sm opacity-70">FanGraphs + Statcast via local API</p>
      </header>

      <DeepDiveClient data={summary} seasons={seasons} />

      <details open className="rounded border border-neutral-800 p-3">
        <summary className="cursor-pointer text-sm opacity-80">Raw Summary (debug)</summary>
        <pre className="mt-2 text-xs overflow-auto max-h-[50vh]">
{JSON.stringify(summary, null, 2)}
        </pre>
      </details>
    </div>
  );
}
