import { SearchX } from "lucide-react";

export function EmptyState() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-xl font-semibold">
        No interview experiences found
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        Try searching with a different company name, role, or keyword.
      </p>
    </div>
  );
}