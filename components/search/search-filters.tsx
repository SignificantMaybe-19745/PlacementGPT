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
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <select
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="">All Companies</option>
        <option value="PhonePe">PhonePe</option>
        <option value="BlackRock">BlackRock</option>
        <option value="UBS">UBS</option>
        <option value="Nomura">Nomura</option>
      </select>

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="">All Roles</option>
        <option value="SDE">SDE</option>
        <option value="Intern">Intern</option>
      </select>

      <Button
        variant="outline"
        onClick={() => {
          setCompany("");
          setRole("");
        }}
      >
        Clear Filters
      </Button>
    </div>
  );
}