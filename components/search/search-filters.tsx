import { Button } from "@/components/ui/button";

interface SearchFiltersProps {
  company: string;
  setCompany: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
}

export function SearchFilters({
  company,
  setCompany,
  role,
  setRole,
}: SearchFiltersProps) {
  return (
    <div className="mt-4 rounded-3xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Refine results</div>
          <div className="text-xs text-muted-foreground">
            Filters are applied instantly on the current results.
          </div>
        </div>

        {(company || role) && (
          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Active filters
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Company
          </label>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          >
            <option value="">All Companies</option>
            <option value="PhonePe">PhonePe</option>
            <option value="BlackRock">BlackRock</option>
            <option value="UBS">UBS</option>
            <option value="Nomura">Nomura</option>
            <option value="JPMC">JPMC</option>
            <option value="Amazon">Amazon</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          >
            <option value="">All Roles</option>
            <option value="SDE">SDE</option>
            <option value="Intern">Intern</option>
            <option value="Analyst">Analyst</option>
            <option value="Data">Data</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={() => {
              setCompany("");
              setRole("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
}