import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search by company, role, topic, or keyword...",
}: SearchBarProps) {
  return (
    <div className="rounded-3xl border border-border/60 bg-background/80 p-3 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <Search className="ml-1 h-5 w-5 text-muted-foreground" />

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit?.();
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />

        {onSubmit ? (
          <Button onClick={onSubmit} className="rounded-2xl">
            Search
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Try “LRU cache”, “system design”, “DP”, or “PhonePe”.</span>
        <span>Enter ↵</span>
      </div>
    </div>
  );
}