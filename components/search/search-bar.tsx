import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Search,
  ArrowRight,
  Building2,
  FileText,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Suggestion = {
  type: "company" | "role" | "title";
  value: string;
};

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

const MAX_SUGGESTIONS = 8;

function getSuggestionIcon(type: Suggestion["type"]) {
  switch (type) {
    case "company":
      return <Building2 className="h-4 w-4" />;
    case "role":
      return <Briefcase className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getSuggestionLabel(type: Suggestion["type"]) {
  switch (type) {
    case "company":
      return "Companies";
    case "role":
      return "Roles";
    default:
      return "Titles";
  }
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search by company, role, topic, or keyword...",
}: SearchBarProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const displaySuggestions = useMemo(
    () => suggestions.slice(0, MAX_SUGGESTIONS),
    [suggestions]
  );

  const groupedSuggestions = useMemo(() => {
    const groups: Record<Suggestion["type"], Array<{ item: Suggestion; index: number }>> = {
      company: [],
      role: [],
      title: [],
    };

    displaySuggestions.forEach((item, index) => {
      groups[item.type].push({ item, index });
    });

    return groups;
  }, [displaySuggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = value.trim();

    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const data = await res.json();

        const seen = new Set<string>();
        const normalized = (Array.isArray(data) ? data : []).filter(
          (item: Suggestion) => {
            const key = `${item.type}:${item.value.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }
        );

        setSuggestions(normalized);
        setOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  function selectSuggestion(item: Suggestion) {
    onChange(item.value);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (displaySuggestions.length === 0) {
      if (e.key === "Enter") onSubmit?.();
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (!open && e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % displaySuggestions.length);
      setOpen(true);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? displaySuggestions.length - 1 : prev - 1
      );
      setOpen(true);
      return;
    }

    if (e.key === "Enter") {
      if (open && activeIndex >= 0 && displaySuggestions[activeIndex]) {
        e.preventDefault();
        selectSuggestion(displaySuggestions[activeIndex]);
        return;
      }
      onSubmit?.();
    }

    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative z-50">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <Search className="ml-1 h-5 w-5 text-muted-foreground" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value.trim().length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (displaySuggestions.length > 0) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
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

      {open && (loading || displaySuggestions.length > 0) && (
        <div className="absolute z-50 mt-3 w-full overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur">
          <div className="border-b border-border/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {loading ? "Searching..." : "Suggestions"}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!loading &&
              (["company", "role", "title"] as const).map((type) => {
                const items = groupedSuggestions[type];
                if (items.length === 0) return null;

                return (
                  <div key={type} className="mb-2">
                    <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {getSuggestionLabel(type)}
                    </div>

                    <div className="space-y-1">
                      {items.map(({ item, index }) => {
                        const active = index === activeIndex;

                        return (
                          <button
                            key={`${item.type}-${item.value}-${index}`}
                            type="button"
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(item);
                            }}
                            className={[
                              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                              active
                                ? "bg-primary/10 text-foreground"
                                : "text-foreground hover:bg-muted/70",
                            ].join(" ")}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground">
                              {getSuggestionIcon(item.type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {item.value}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {!loading && displaySuggestions.length === 0 && value.trim().length >= 2 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No suggestions found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}