import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="mt-8 flex items-center rounded-2xl border border-border bg-background px-4 py-3 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
      <Search className="mr-3 h-5 w-5 text-muted-foreground" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by company, role, or keyword..."
        className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}