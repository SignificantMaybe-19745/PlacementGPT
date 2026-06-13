import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { ResultCard } from "@/components/search/result-card";
import { ResultSkeleton } from "@/components/search/result-skeleton";
import { EmptyState } from "@/components/search/empty-state";
import { SearchFilters } from "@/components/search/search-filters";
export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("");
const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
  if (!query.trim()) {
    setResults([]);
    return;
  }

  const timer = setTimeout(async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );

      const data = await res.json();

      // Adjust this depending on your API response shape
      setResults(data.results ?? data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [query]);

  //console.log(results);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground">
  🚀 125+ Interview Experiences Indexed
</div>
          <h1 className="text-5xl font-bold tracking-tight lg:text-6xl">
  Search Real Placement
  <br />
  Interview Experiences
</h1>

<p className="mt-6 max-w-2xl text-lg text-muted-foreground">
  Find company-specific interview rounds, coding questions,
  HR experiences, and candidate insights in seconds.
</p>

          <SearchBar value={query} onChange={setQuery} />
          <div className="mt-6 flex flex-wrap gap-2">
  {[
    "PhonePe",
    "BlackRock",
    "UBS",
    "Nomura",
    "JPMorgan",
    "Uber",
  ].map((item) => (
    <button
      key={item}
      onClick={() => setQuery(item)}
      className="rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {item}
    </button>
  ))}
</div>
<SearchFilters
  company={companyFilter}
  setCompany={setCompanyFilter}
  role={roleFilter}
  setRole={setRoleFilter}
/>
{query && (
  <p className="mt-8 text-sm text-muted-foreground">
    {loading
      ? "Searching..."
      : `${results.length} result${results.length === 1 ? "" : "s"} found`}
  </p>
)}
<div className="mt-6">
  {loading ? (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <ResultSkeleton key={i} />
      ))}
    </div>
  ) : results.length > 0 ? (
    <div className="grid gap-4">
      {results.map((result) => (
        <ResultCard key={result.id} result={result} />
      ))}
    </div>
  ) : (
    query.trim() && <EmptyState />
  )}
</div>
        </div>
      </main>
    </div>
  );
}
